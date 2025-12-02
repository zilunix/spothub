# 06. Docker-образы и публикация в registry

Цель: собрать образы backend и frontend, запушить в Docker Hub (или другой registry), чтобы потом использовать их в манифестах Kubernetes.

## 1. Предварительные условия

- На машине сборки установлен Docker.
- Есть аккаунт Docker Hub:
  - username: `YOUR_DOCKERHUB_USER`
- Выполнен логин:

  ```bash
  docker login
  ```

## 2. Backend: сборка образа

Из корня репозитория:

```bash
cd backend

docker build -t YOUR_DOCKERHUB_USER/sporthub-backend:0.1 .
```

Проверка:

```bash
docker run --rm -p 8000:8000 YOUR_DOCKERHUB_USER/sporthub-backend:0.1
```

- Открыть `http://localhost:8000/health`
- Открыть `http://localhost:8000/leagues`

Если всё ок, остановить контейнер (Ctrl+C).

Публикация:

```bash
docker push YOUR_DOCKERHUB_USER/sporthub-backend:0.1
```

## 3. Frontend: сборка образа

```bash
cd ../frontend

docker build -t YOUR_DOCKERHUB_USER/sporthub-frontend:0.1 .
```

Проверка:

```bash
docker run --rm -p 8080:80 YOUR_DOCKERHUB_USER/sporthub-frontend:0.1
```

Открыть `http://localhost:8080/` и проверить, что SPA стартует и пытается обращаться к API.

Публикация:

```bash
docker push YOUR_DOCKERHUB_USER/sporthub-frontend:0.1
```

## 4. Обновление образов в манифестах Kubernetes

В каталогах:

- `k8s/sporthub-backend-deployment.yaml`
- `k8s/sporthub-frontend-deployment.yaml`

нужно заменить `YOUR_DOCKERHUB_USER` на свой username.

После этого можно переходить к деплою в кластер: `07_sporthub_k8s_deploy.md`.
