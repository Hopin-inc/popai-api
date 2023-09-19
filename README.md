# POPAI API

### 1. 事前準備

Dockerを開発環境にインストールする。

### 2. 開発環境構築

#### 2-1. 開発環境をhttps化する
下記手順を参考に自己証明書を準備する
https://qiita.com/k_kind/items/b87777efa3d29dcc4467

プロジェクトルート直下に .misc というディレクトリを作成する。

.misc 内に自己署名証明書を格納する。 (ファイル名は localhost.pem , localhost-key.pem )

#### 2-2. コンテナをビルドする。
```sh
$ docker compose build
```

#### 2-3. コンテナを起動する。

```sh
$ docker compose up -d
```

#### 2-4. データべースを作成する。(初回、もしくはDB構成を変更した場合のみ)

```sh
$ yarn db:migrate
```
※dockerのmysqlコンテナの作成が完了してからコマンドを実行してください。