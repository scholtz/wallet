kubectl apply -f deployment-stable.yaml -n awallet
kubectl delete configmap awallet-stable-conf -n awallet
kubectl create configmap awallet-stable-conf --from-file=stable -n awallet
kubectl rollout restart deployment/awallet-stable-deployment -n awallet
kubectl rollout status deployment/awallet-stable-deployment -n awallet