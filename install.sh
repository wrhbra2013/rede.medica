#!/bin/bash
# Script de instalação do Rede.Médica - Agendamentos Médicos
# Uso: sudo bash install.sh
# Destino: /var/www/rede.medica

set -e

INSTALL_DIR="/var/www/rede.medica"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  Rede.Médica - Instalação"
echo "========================================"
echo ""
echo "Instalando em: $INSTALL_DIR"

if [ "$EUID" -ne 0 ]; then
  echo "Este script precisa ser executado como root (sudo)."
  exit 1
fi

echo ""
echo "[1/4] Verificando dependências..."

if ! command -v nginx &> /dev/null; then
  echo "  → Instalando nginx..."
  apt-get update -qq
  apt-get install -y -qq nginx
else
  echo "  → nginx já instalado"
fi

echo ""
echo "[2/4] Criando diretório de destino..."
mkdir -p "$INSTALL_DIR"

echo ""
echo "[3/4] Copiando arquivos..."
cp -r "$SRC_DIR/index.html" "$INSTALL_DIR/"
cp -r "$SRC_DIR/css" "$INSTALL_DIR/"
cp -r "$SRC_DIR/js" "$INSTALL_DIR/"
chown -R www-data:www-data "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

echo ""
echo "[4/4] Configurando nginx..."

NGINX_CONF="/etc/nginx/sites-available/rede.medica"

if [ ! -f "$NGINX_CONF" ]; then
  cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name rede.medica;
    root /var/www/rede.medica;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires max;
        add_header Cache-Control "public, immutable";
    }
}
EOF
  echo "  → Configuração nginx criada em $NGINX_CONF"

  if [ -d "/etc/nginx/sites-enabled" ]; then
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/"
  fi
fi

echo ""
echo "Testando configuração do nginx..."
nginx -t

echo ""
echo "Recarregando nginx..."
systemctl reload nginx || systemctl restart nginx

echo ""
echo "========================================"
echo "  Instalação concluída!"
echo ""
echo "  Acesse: http://$(hostname -I | awk '{print $1}')"
echo "  ou:     http://rede.medica"
echo ""
echo "  Diretório: $INSTALL_DIR"
echo "========================================"
