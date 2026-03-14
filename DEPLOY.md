# Snake 云服务器部署

## 1. 服务器准备

以 Ubuntu 为例：

```bash
sudo apt update
sudo apt install -y nginx nodejs npm
```

确认安全组和防火墙已放行：

- `80/tcp`
- `22/tcp`

## 2. 上传项目

把整个项目上传到服务器：

```bash
sudo mkdir -p /var/www/snake
sudo chown -R $USER:$USER /var/www/snake
```

然后把仓库文件放到 `/var/www/snake`。

## 3. 启动应用

项目没有第三方依赖，直接启动即可：

```bash
cd /var/www/snake
npm start
```

如果只是临时验证，此时可以直接访问：

- `http://你的服务器IP:3000`

## 4. 配置 systemd 常驻

```bash
sudo cp deploy/snake.service /etc/systemd/system/snake.service
sudo systemctl daemon-reload
sudo systemctl enable snake
sudo systemctl start snake
sudo systemctl status snake
```

## 5. 配置 nginx 通过 IP 访问

```bash
sudo cp deploy/snake.nginx.conf /etc/nginx/sites-available/snake
sudo ln -sf /etc/nginx/sites-available/snake /etc/nginx/sites-enabled/snake
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

完成后可直接访问：

- `http://你的服务器IP`

## 6. 更新部署

项目更新后执行：

```bash
cd /var/www/snake
sudo systemctl restart snake
```
