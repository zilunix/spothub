# 03. MetalLB, ingress-nginx и доступ по доменным именам

Цель: сделать так, чтобы с Windows можно было зайти на `http://sporthub.local/` и попадать в кластер.

## 1. MetalLB — имитация LoadBalancer в локальной сети

### 1.1 Подготовка sysctl

На всех нодах (или минимум на master + один worker):

```bash
cat <<EOF | sudo tee /etc/sysctl.d/metallb.conf
net.ipv4.ip_forward=1
net.ipv4.conf.all.rp_filter=0
net.ipv4.conf.default.rp_filter=0
EOF

sudo sysctl --system
```

### 1.2 Установка MetalLB

На `k8s-master`:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
```

Проверка:

```bash
kubectl get pods -n metallb-system
```

Ожидаем `metallb-controller` и `metallb-speaker` в статусе `Running`.

### 1.3 Настройка пула IP

Выбери свободный диапазон IP из той же подсети, где живут ноды. Например:

- Ноды: `192.168.56.11–13`
- Пул MetalLB: `192.168.56.200–192.168.56.210`

Создай ресурсы:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-address-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.56.200-192.168.56.210
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-address-pool
EOF
```

## 2. Установка ingress-nginx через Helm

### 2.1 Установка Helm (если нет)

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

### 2.2 Добавление репозитория ingress-nginx и установка

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer
```

Проверка:

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

У `ingress-nginx-controller` должен появиться `EXTERNAL-IP` из пула MetalLB, например `192.168.56.200`.

Считаем далее, что IP ingress'а — `192.168.56.200`.

## 3. Настройка hosts на Windows

На Windows открыть блокнот от имени администратора и отредактировать:

`C:\Windows\System32\drivers\etc\hosts`

Добавить строки:

```text
192.168.56.200  sporthub.local
192.168.56.200  lab.local
192.168.56.200  grafana.local
```

(добавишь другие домены по мере необходимости)

## 4. Мини-тест Ingress (nginx)

1. Создать namespace lab и деплой nginx:

   ```bash
   kubectl create namespace lab

   kubectl create deployment nginx-test --image=nginx -n lab
   kubectl expose deployment nginx-test --port=80 -n lab
   ```

2. Создать Ingress:

   ```bash
   cat <<EOF | kubectl apply -f -
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: nginx-test-ingress
     namespace: lab
   spec:
     ingressClassName: nginx
     rules:
     - host: lab.local
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: nginx-test
               port:
                 number: 80
   EOF
   ```

3. С Windows открыть `http://lab.local/`.

   Должна отобразиться дефолтная страница nginx.

Если это работает — ingress и MetalLB настроены корректно. Далее можно готовить namespaces, storage и приложение SportHub.
