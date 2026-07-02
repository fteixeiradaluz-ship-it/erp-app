import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL_UNPOOLED || 
  "postgresql://postgres:postgres@localhost:5432/erp?sslmode=disable";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
