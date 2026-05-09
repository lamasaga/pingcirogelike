#!/usr/bin/env bash
# 在服务器上以 ubuntu（或有 sudo 的普通用户）执行：拉取代码到 /srv/pingchi 并设置可读权限。
set -euo pipefail

REPO_URL="${PINGCHI_REPO_URL:-https://github.com/lamasaga/pingcirogelike.git}"
TARGET="${PINGCHI_TARGET:-/srv/pingchi}"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "请不要用 root 直接运行本脚本；请使用 ubuntu 等有 sudo 的用户。"
  exit 1
fi

sudo mkdir -p "$TARGET"
sudo chown -R "$(whoami):$(whoami)" "$TARGET"

if [[ ! -d "$TARGET/.git" ]]; then
  git clone "$REPO_URL" "$TARGET"
else
  git -C "$TARGET" pull origin main
fi

chmod -R a+rX "$TARGET"
echo "完成：代码已在 $TARGET"
echo "下一步：配置 Nginx（见 拼词肉鸽-部署与更新.md），执行:"
echo "  sudo cp $TARGET/deploy/pingchi-subpath.snippet.conf /etc/nginx/snippets/pingchi-subpath.conf"
echo "  然后在负责 IP:80 的 server {} 内加入一行: include /etc/nginx/snippets/pingchi-subpath.conf;"
echo "  sudo nginx -t && sudo systemctl reload nginx"
