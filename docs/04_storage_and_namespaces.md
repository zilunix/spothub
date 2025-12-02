# 04. StorageClass и namespaces

Цель: включить динамическое выделение томов и подготовить логическую структуру namespaces.

## 1. Установка local-path-provisioner

На `k8s-master`:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
```

Проверка:

```bash
kubectl get pods -n local-path-storage
kubectl get storageclass
```

Сделать `local-path` классом по умолчанию:

```bash
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## 2. Namespaces

Создадим базовые пространства имён:

```bash
kubectl create namespace sporthub
kubectl create namespace monitoring
# lab уже мог быть создан на прошлом шаге
```

Проверка:

```bash
kubectl get ns
```

## 3. PostgreSQL для SportHub (опционально)

Пример манифестов для PostgreSQL можно добавить позже. В данном MVP достаточно:

- StorageClass есть;
- namespace `sporthub` готов для деплоя приложений и БД.

Далее переходим к приложению: `05_sporthub_app_code.md`.
