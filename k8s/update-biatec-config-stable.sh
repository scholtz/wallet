kubectl apply -f deployment-stable-biatec.yaml -n awallet
kubectl delete configmap biatec-wallet-stable-conf -n awallet
kubectl create configmap biatec-wallet-stable-conf --from-file=stable-biatec -n awallet
kubectl rollout restart deployment/biatec-wallet-stable-deployment -n awallet
kubectl rollout status deployment/biatec-wallet-stable-deployment -n awallet