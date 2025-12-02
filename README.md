# Домашняя Kubernetes-лаборатория + SportHub (Полный MVP)

Этот репозиторий содержит:

- подробный пошаговый план развёртывания 3-нодового Kubernetes-кластера (kubeadm);
- развёртывание MetalLB и ingress-nginx;
- приложение SportHub (backend на FastAPI + frontend на React/Vite);
- манифесты Kubernetes для деплоя SportHub в кластер.

## Структура

- `docs/` — детальные шаги по развёртыванию (читать по порядку).
- `backend/` — исходный код API SportHub + Dockerfile.
- `frontend/` — исходный код SPA SportHub + Dockerfile.
- `k8s/` — манифесты Kubernetes (namespace, конфиги, деплой, ingress, БД).

Рекомендуемый порядок:

1. `docs/01_infrastructure_setup.md`
2. `docs/02_kubernetes_cluster.md`
3. `docs/03_metallb_ingress_dns.md`
4. `docs/04_storage_and_namespaces.md`
5. `docs/05_sporthub_app_code.md`
6. `docs/06_sporthub_docker_and_push.md`
7. `docs/07_sporthub_k8s_deploy.md`
8. `docs/08_monitoring_and_next_steps.md`
