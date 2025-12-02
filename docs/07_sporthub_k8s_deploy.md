# 07. Деплой SportHub в Kubernetes

Цель: развернуть backend и frontend в namespace `sporthub`, настроить ConfigMap/Secret и Ingress, проверить доступ по `http://sporthub.local/`.

## 1. Подготовка ConfigMap и Secret

Отредактируй `k8s/sporthub-config.yaml` под свой внешний sports API (или оставь заглушки).

Применение:

```bash
kubectl apply -f k8s/sporthub-config.yaml
```

Проверка:

```bash
kubectl get cm,secret -n sporthub
```

## 2. Деплой backend

Убедись, что в `k8s/sporthub-backend-deployment.yaml`:

- указано имя образа: `YOUR_DOCKERHUB_USER/sporthub-backend:0.1`.

Применение:

```bash
kubectl apply -f k8s/sporthub-backend-deployment.yaml
kubectl apply -f k8s/sporthub-backend-service.yaml
```

Проверка:

```bash
kubectl get pods -n sporthub
kubectl get svc -n sporthub
```

Когда поды `sporthub-backend` в статусе `Running`, можно сделать тест изнутри кластера:

```bash
kubectl -n sporthub exec -it $(kubectl -n sporthub get pod -l app=sporthub-backend -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:8000/health
```

## 3. Деплой frontend

Аналогично:

```bash
kubectl apply -f k8s/sporthub-frontend-deployment.yaml
kubectl apply -f k8s/sporthub-frontend-service.yaml
```

Проверка:

```bash
kubectl get pods -n sporthub
kubectl get svc -n sporthub
```

## 4. Ingress

Применить:

```bash
kubectl apply -f k8s/sporthub-ingress.yaml
```

Проверка:

```bash
kubectl get ingress -n sporthub
```

Убедись, что:

- Ingress использует `ingressClassName: nginx`;
- host — `sporthub.local`.

## 5. Тест с Windows

1. В `hosts` прописан IP ingress (`192.168.56.200`) для `sporthub.local`.
2. Открыть `http://sporthub.local/`.

Должна отобразиться SPA SportHub.

В DevTools (F12 → Network) видно запросы к `/api/...`. Если что-то не работает — смотреть:

- `kubectl logs` backend и frontend;
- конфигурацию Ingress (`k8s/sporthub-ingress.yaml`).

## 6. Удаление/обновление

Для обновления:

- Меняем теги образов.
- Обновляем Deployment:

  ```bash
  kubectl set image deployment/sporthub-backend backend=YOUR_DOCKERHUB_USER/sporthub-backend:0.2 -n sporthub
  kubectl set image deployment/sporthub-frontend frontend=YOUR_DOCKERHUB_USER/sporthub-frontend:0.2 -n sporthub
  ```

Для удаления:

```bash
kubectl delete -f k8s/sporthub-ingress.yaml
kubectl delete -f k8s/sporthub-frontend-service.yaml
kubectl delete -f k8s/sporthub-frontend-deployment.yaml
kubectl delete -f k8s/sporthub-backend-service.yaml
kubectl delete -f k8s/sporthub-backend-deployment.yaml
kubectl delete -f k8s/sporthub-config.yaml
```
