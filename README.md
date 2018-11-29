# Features


# Usage

## Environment variables

| Name                                | Required | Value            | Purpose                                 |
|-------------------------------------|----------|------------------|-----------------------------------------|
| `NODE_ENV`                          | true     |                  | 環境名                                  |
| `REDIS_HOST`                        | true     |                  | REDISホスト                             |
| `REDIS_PORT`                        | true     |                  | REDISポート                             |
| `REDIS_KEY`                         | true     |                  | REDISキー                              |
| `API_ENDPOINT`                      | true     |                  | CINERINO API エンドポイント              |
| `CLIENT_ID_OAUTH2`                  | true     |                  | クライアントID                           |
| `CLIENT_SECRET_OAUTH2`              | true     |                  | クライアントSECRET                       |
| `OAUTH2_SERVER_DOMAIN`              | true     |                  | 認可サーバードメイン                     |
| `AUTH_REDIRECT_URI`                 | true     |                  | サインインコールバック URL               |
| `AUTH_LOGUOT_URI`                   | true     |                  | サインアウトコールバック URL             |
| `ALLOWED_IPS`                       | false    |                  | IP制限IPリスト(カンマ区切り)              |
| `BASIC_AUTH_NAME`                   | false    |                  | ベーシック認証ID                         |
| `BASIC_AUTH_PASS`                   | false    |                  | ベーシック認証PASS                       |
| `DEBUG`                             | false    |  toei-pos:*      | デバッグ                                |


# Build

ビルドは以下で実行できます。

```shell
npm run build
```

# Tests

構文チェックは以下で実行できます。

```shell
npm run check
```

