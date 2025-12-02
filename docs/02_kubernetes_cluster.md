# 02. Развёртывание Kubernetes-кластера через kubeadm

Цель: установить kubeadm, kubelet, kubectl, containerd и развернуть кластер на 3 нодах.

## 1. Общая подготовка нод

Все команды этого блока выполняются на **каждой** ноде (master + оба worker).

### 1.1 Отключение swap

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
free -h   # проверка, Swap должен быть 0
```

### 1.2 Модули ядра и sysctl

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

Проверка:

```bash
sysctl net.ipv4.ip_forward
```

### 1.3 Установка containerd

```bash
sudo apt update
sudo apt install -y containerd
```

Создать конфиг:

```bash
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
```

В файле `/etc/containerd/config.toml` найти блок `plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options`
и выставить:

```toml
SystemdCgroup = true
```

Перезапуск:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
sudo systemctl status containerd
```

### 1.4 Установка kubeadm, kubelet, kubectl

```bash
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key |       sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg]     https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /" |       sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

Проверка версий:

```bash
kubeadm version
kubectl version --client
```

## 2. Инициализация master-ноды

Команды этого раздела выполняются только на `k8s-master`.

1. Запуск `kubeadm init` (пример с Flannel-подсетью):

   ```bash
   sudo kubeadm init          --pod-network-cidr=10.244.0.0/16          --apiserver-advertise-address=192.168.56.11
   ```

2. В конце команда выведет блок типа:

   ```text
   kubeadm join 192.168.56.11:6443 --token <TOKEN>          --discovery-token-ca-cert-hash sha256:<HASH>
   ```

   Скопируй его в файл или блокнот — он нужен для worker-нод.

3. Настроить `kubectl`:

   ```bash
   mkdir -p $HOME/.kube
   sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
   sudo chown $(id -u):$(id -g) $HOME/.kube/config

   kubectl get nodes
   ```

   Пока будет только `k8s-master` в статусе `NotReady`.

## 3. Установка CNI (Flannel)

На `k8s-master`:

```bash
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
```

Проверка:

```bash
kubectl get pods -n kube-flannel
kubectl get pods -n kube-system
```

Ожидается, что `coredns` перейдут в статус `Running`.

## 4. Присоединение worker-нод

На `k8s-worker1` и `k8s-worker2`:

- Выполнить команду `kubeadm join ...`, которую выдал master. Пример:

```bash
sudo kubeadm join 192.168.56.11:6443 --token <TOKEN>       --discovery-token-ca-cert-hash sha256:<HASH>
```

После успешного join:

- На `k8s-master`:

```bash
kubectl get nodes
```

Ожидаемый результат:

- `k8s-master`   Ready   control-plane
- `k8s-worker1`  Ready
- `k8s-worker2`  Ready

Теперь кластера достаточно, чтобы ставить MetalLB и ingress-nginx: см. `03_metallb_ingress_dns.md`.
