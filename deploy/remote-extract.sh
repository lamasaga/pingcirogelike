#!/usr/bin/env bash
# 解压上传包到 /srv/pingchi；支持 .tar.gz（推荐，UTF-8 文件名）或 .zip（遗留）
set -euo pipefail
ARCHIVE="${1:?用法: bash remote-extract.sh /tmp/pingchi-deploy.tar.gz}"

sudo apt-get update -qq

sudo rm -rf /srv/pingchi
sudo mkdir -p /srv/pingchi
sudo chown ubuntu:ubuntu /srv/pingchi

if [[ "$ARCHIVE" == *.tar.gz ]] || [[ "$ARCHIVE" == *.tgz ]]; then
  tar -xzf "$ARCHIVE" -C /srv/pingchi
elif [[ "$ARCHIVE" == *.zip ]]; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unzip
  unzip -o "$ARCHIVE" -d /srv/pingchi
else
  echo "不支持的压缩包类型: $ARCHIVE （请使用 .tar.gz 或 .zip）"
  exit 1
fi

chmod -R a+rX /srv/pingchi

sudo mkdir -p /etc/nginx/snippets
sudo cp /srv/pingchi/deploy/pingchi-subpath.snippet.conf /etc/nginx/snippets/pingchi-subpath.conf

if ! grep -Rqs "pingchi-subpath" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null; then
  echo ""
  echo ">>> 尚未在 nginx 站点配置中检测到 pingchi。请在「监听 80」的 server{} 内添加一行："
  echo "    include /etc/nginx/snippets/pingchi-subpath.conf;"
  echo "    然后执行: sudo nginx -t && sudo systemctl reload nginx"
  echo ""
  exit 0
fi

sudo nginx -t
sudo systemctl reload nginx
echo "nginx 已检查并重载。"
curl -sI --connect-timeout 5 "http://127.0.0.1/pingchi/" | head -n 8 || true
