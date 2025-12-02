# 01. Подготовка инфраструктуры (3 ноды)

Цель: получить 3 виртуальные машины (или bare metal) в одной сети, с полным сетевым доступом друг к другу и с Windows-хоста.

## 1. Целевая схема

- `k8s-master`  — control-plane нода
- `k8s-worker1` — worker
- `k8s-worker2` — worker

Пример сети:

- Подсеть: `192.168.56.0/24`
- IP:
  - `192.168.56.11` — k8s-master
  - `192.168.56.12` — k8s-worker1
  - `192.168.56.13` — k8s-worker2

> Если у тебя уже есть 3 ноды и они пингуются, просто пробеги глазами чек-лист и убедись, что всё совпадает.

## 2. Настройка hostname и /etc/hosts

На каждой ноде:

```bash
sudo hostnamectl set-hostname k8s-master    # или k8s-worker1 / k8s-worker2
```

Проверить:

```bash
hostname
```

Прописать все ноды в `/etc/hosts` (на каждой):

```bash
sudo nano /etc/hosts
```

Добавить:

```text
192.168.56.11  k8s-master
192.168.56.12  k8s-worker1
192.168.56.13  k8s-worker2
```

Проверка:

```bash
ping -c 3 k8s-master
ping -c 3 k8s-worker1
ping -c 3 k8s-worker2
```

## 3. Сетевые требования (firewall)

Для домашней лабы проще всего отключить UFW:

```bash
sudo ufw status
sudo ufw disable
```

Если используется другой firewall — убедись, что не блокируются порты:

- 22 (SSH),
- 6443 (API Kubernetes),
- 10250–10259 (kubelet и control-plane),
- 30000–32767 (NodePort),
- 80, 443 (Ingress / HTTP(S)).

## 4. Доступ с Windows

1. Установи MobaXterm / PuTTY.
2. Создай сессии:
   - `k8s-master`, `k8s-worker1`, `k8s-worker2` — по IP.
3. Проверь вход на каждую ноду по SSH.
4. Опционально: настроить авторизацию по SSH-ключам.

На этом инфраструктурный слой готов, можно переходить к установке Kubernetes: `02_kubernetes_cluster.md`.
