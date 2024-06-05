kubectl apply -f deployment-main.yaml -n awallet
kubectl delete configmap awallet-main-conf -n awallet
kubectl create configmap awallet-main-conf --from-file=conf -n awallet
kubectl rollout restart deployment/awallet-web-main-landing-deployment -n awallet
kubectl rollout status deployment/awallet-web-main-landing-deployment -n awallet