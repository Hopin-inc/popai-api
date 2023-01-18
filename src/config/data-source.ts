import dotenv from "dotenv";
import path from "path";
import { DataSource, DataSourceOptions } from "typeorm";

// Load env file
dotenv.config({ path: path.join(__dirname, "../.env") });

function envString<T>(data: T, defaultValue: T): T {
  return data || defaultValue;
}

const databaseConfig: DataSourceOptions = {
  type: "mysql",
  host: envString(process.env.DB_HOST, ""),
  port: Number(process.env.DB_PORT),
  username: envString(process.env.DB_USERNAME, ""),
  password: envString(process.env.DB_PASSWORD, ""),
  database: envString(process.env.DB_DATABASE, ""),
  entities: [
    path.join(__dirname, "../entify/*.entity.{ts,js}"),
    path.join(__dirname, "../entify/**/*.entity.{ts,js}"),
  ],
  migrations: [
    path.join(__dirname, "../database/migrations/*.{ts,js}"),
  ],
  charset: "utf8mb4_unicode_ci",
  synchronize: false,
  logging: false,
};

console.log("DB-HOST:" + envString(process.env.DB_HOST, ""));

export const AppDataSource = new DataSource(databaseConfig);
