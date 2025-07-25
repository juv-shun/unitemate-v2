"""Lambda handlers for user-related API endpoints."""

import json
import os
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import boto3
from boto3.dynamodb.conditions import Key
from pydantic import BaseModel, Field, field_validator

from src.utils.response import create_error_response, create_success_response

# Pydanticモデル定義


class Auth0UserProfile(BaseModel):
    """Auth0から取得したユーザープロファイル情報."""

    sub: str
    nickname: str | None = None
    name: str | None = None
    picture: str | None = None
    updated_at: str | None = None


class CreateUserRequest(BaseModel):
    """ユーザー作成リクエスト."""

    auth0_profile: Auth0UserProfile
    trainer_name: str = Field(..., min_length=1, max_length=50)
    twitter_id: str | None = Field(None, max_length=16)
    preferred_roles: list[str] = Field(default_factory=list, max_length=5)
    bio: str | None = Field(None, max_length=500)

    @field_validator("trainer_name")
    @classmethod
    def validate_trainer_name(cls, v: str) -> str:
        """トレーナー名のバリデーション."""
        if not v.strip():
            error_msg = "トレーナー名は必須です。"
            raise ValueError(error_msg)
        return v.strip()

    @field_validator("twitter_id")
    @classmethod
    def validate_twitter_id(cls, v: str | None) -> str | None:
        """Twitter IDのバリデーション."""
        if v is None:
            return v
        if not v.startswith("@"):
            error_msg = "Twitter IDは@マーク付きで入力してください。"
            raise ValueError(error_msg)
        return v

    @field_validator("preferred_roles")
    @classmethod
    def validate_preferred_roles(cls, v: list[str]) -> list[str]:
        """希望ロールのバリデーション."""
        valid_roles = {"TOP_LANE", "TOP_STUDY", "MIDDLE", "BOTTOM_LANE", "BOTTOM_STUDY"}
        for role in v:
            if role not in valid_roles:
                error_msg = f"無効な希望ロールです: {role}"
                raise ValueError(error_msg)
        return v


if TYPE_CHECKING:
    from mypy_boto3_dynamodb.resources import TableResource  # type: ignore[attr-defined]
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource  # type: ignore[attr-defined]
else:
    TableResource = Any
    DynamoDBServiceResource = Any


def get_dynamodb() -> "DynamoDBServiceResource":  # Changed to double quotes
    """Get a DynamoDB resource client.

    Returns:
        DynamoDBServiceResource: DynamoDBリソースクライアント.

    """
    if os.environ.get("IS_OFFLINE"):
        return boto3.resource(
            "dynamodb",
            endpoint_url="http://localhost:8000",
            region_name="ap-northeast-1",
        )
    return boto3.resource("dynamodb")


def get_user_table() -> "TableResource":  # Changed to double quotes
    """Get the DynamoDB table for users.

    Returns:
        TableResource: DynamoDBユーザーテーブル.

    """
    dynamodb: DynamoDBServiceResource = get_dynamodb()  # Changed to double quotes
    table_name = os.environ["USERS_TABLE_NAME"]
    return dynamodb.Table(table_name)


def get_me(event: dict, _context: object) -> dict:
    """ユーザー情報取得(認証済み前提).

    Args:
        event (dict): Lambdaイベントオブジェクト.
        _context (object): Lambda実行コンテキスト.

    Returns:
        dict: ユーザー情報またはエラーレスポンス.

    """
    # オーソライザーから渡されたユーザー情報
    auth0_user_id = event["requestContext"]["authorizer"]["lambda"]["user_id"]
    if not auth0_user_id:
        return create_error_response(400, "User ID not found in context")

    # DynamoDBからユーザー情報を取得
    table = get_user_table()
    response = table.query(
        IndexName="Auth0SubIndex",
        KeyConditionExpression=Key("auth0_sub").eq(auth0_user_id),
    )

    if not response["Items"]:
        return create_error_response(404, "User not found")

    return create_success_response(response["Items"][0])


def create_user(event: dict, _context: object) -> dict:
    """新しいユーザーを作成(認証済み前提).

    Args:
        event (dict): Lambdaイベントオブジェクト.
        _context (object): Lambda実行コンテキスト.

    Returns:
        dict: 作成されたユーザー情報またはエラーレスポンス.

    """
    # オーソライザーから渡されたユーザー情報
    auth0_user_id = event["requestContext"]["authorizer"]["lambda"]["user_id"]

    # Pydanticモデルでリクエストボディをバリデーション
    try:
        create_request = CreateUserRequest(**json.loads(event["body"]))
    except ValueError as e:
        return create_error_response(400, str(e))

    # Auth0プロファイル情報とユーザー入力情報を抽出
    discord_info = _extract_discord_info_from_auth0(create_request.auth0_profile.model_dump())
    user_input = {
        "trainer_name": create_request.trainer_name,
        "twitter_id": create_request.twitter_id,
        "preferred_roles": create_request.preferred_roles,
        "bio": create_request.bio,
    }

    table = get_user_table()
    # 既存ユーザーの確認
    existing_user_response = table.query(
        IndexName="Auth0SubIndex",
        KeyConditionExpression=Key("auth0_sub").eq(auth0_user_id),
    )
    if existing_user_response["Items"]:
        return create_error_response(409, "このアカウントは既に登録されています。")

    # 新しいユーザーを作成
    new_user_data = _create_new_user_in_db(auth0_user_id, discord_info, user_input)

    return create_success_response(new_user_data, 201)


def _extract_discord_info_from_auth0(auth0_profile_info: dict) -> dict:
    """Extract Discord related information from Auth0 user profile information.

    This function assumes auth0_profile_info could be from id_token claims or
    the /userinfo endpoint. Auth0's 'nickname' might be Discord's
    username#discriminator. 'picture' is expected to be the Discord avatar URL.
    The accuracy of this function depends heavily on Auth0 IdP connection and rule settings.

    Args:
        auth0_profile_info (dict): Auth0プロファイル情報.

    Returns:
        dict: 抽出されたDiscord情報.

    """
    # Try to get username, discriminator, and avatar from common Auth0 fields.
    # These fields might be directly available or nested within 'identities' or custom claims.
    nickname = auth0_profile_info.get("nickname", "")  # Often holds username#discriminator for Discord
    name = auth0_profile_info.get("name", "")  # Can be a fallback
    picture = auth0_profile_info.get("picture", "")  # Usually the avatar

    # Example of accessing nested data if Discord info is in identities array:
    # identities = auth0_profile_info.get("identities", [])
    # discord_identity_data = next((idt for idt in identities if idt.get("provider") == "discord"), None)
    # if discord_identity_data:
    #     nickname = discord_identity_data.get("profileData", {}).get("username", nickname)
    #     picture = discord_identity_data.get("profileData", {}).get("avatar_url", picture)

    discord_username_field = nickname or name

    # Handle new Discord usernames (no discriminator) vs. old (username#discriminator)
    if "#" in discord_username_field:
        username, discriminator = discord_username_field.split("#", 1)
        # Ensure discriminator is not empty if # is present
        discriminator = discriminator if discriminator else None
    else:
        username = discord_username_field
        discriminator = None  # For new Discord usernames or if not available

    if not username:  # If username is still empty, use a default
        username = "Unknown User"

    return {
        "discord_username": username,
        "discord_discriminator": discriminator,
        "discord_avatar_url": picture,  # Renamed for clarity
    }


def _create_new_user_in_db(discord_user_id: str, discord_info: dict, user_input: dict) -> dict:
    """Create and put a new user item into DynamoDB and return the API-friendly user data.

    Args:
        discord_user_id (str): DiscordユーザーID.
        discord_info (dict): Discordユーザー情報.
        user_input (dict): ユーザー入力情報.

    Returns:
        dict: 作成されたユーザーデータ.

    """
    table = get_user_table()
    now = int(datetime.now(UTC).timestamp())

    new_user_item = {
        "user_id": discord_user_id,  # PK: Discord's native ID (from Auth0 'sub')
        "auth0_sub": discord_user_id,  # GSI PK: Auth0 'sub' (same as user_id here)
        "discord_username": discord_info["discord_username"],
        "discord_discriminator": discord_info.get("discord_discriminator"),
        "discord_avatar_url": discord_info.get("discord_avatar_url"),
        "app_username": discord_info["discord_username"],  # 後方互換性のため残す
        "trainer_name": user_input["trainer_name"],  # 新しいフィールド
        "twitter_id": user_input.get("twitter_id"),  # 新しいフィールド
        "preferred_roles": user_input.get("preferred_roles", []),  # 新しいフィールド
        "bio": user_input.get("bio"),  # 新しいフィールド
        "rate": 1500,
        "max_rate": 1500,
        "match_count": 0,
        "win_count": 0,
        "created_at": now,
        "updated_at": now,
    }

    table.put_item(Item=new_user_item)
    return new_user_item
