-- ================================================================
-- CHOPKAR — MIGRATION V3
-- 新增: 商家自定义 logo (Supabase Storage URL)
-- 在 Supabase SQL Editor 执行一次 (可重复执行)
-- ================================================================

alter table public.merchants add column if not exists logo_url text;

-- 说明:
-- brand_color 列已存在 (default '#993C1D' 可选改默认)。
-- logo_url 存 Supabase Storage 'logos' 桶里的公开图片 URL。
-- 'logos' 桶由后端 upload-logo 接口用 service key 自动创建为 public;
-- 若自动创建失败 (例如 SERVICE_KEY 实为 anon), 请手动在
-- Supabase → Storage → New bucket → 名称 "logos" → 勾选 Public 创建。
