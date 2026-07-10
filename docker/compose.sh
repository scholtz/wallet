if [ "$ver" == "" ]; then
ver=1.0.0
fi

git_commit=$(git rev-parse --short HEAD)
build_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "docker build -t \"scholtz2/a-wallet:$ver-main\" -f Dockerfile --build-arg GIT_COMMIT=$git_commit --build-arg BUILD_DATE=$build_date .."
nice -n 20 docker build -t "scholtz2/a-wallet:$ver-main" -f Dockerfile --build-arg GIT_COMMIT="$git_commit" --build-arg BUILD_DATE="$build_date" .. || error_code=$?
if [ "$error_code" != "" ]; then
echo "$error_code";
    echo "failed to build";
	exit 1;
fi

docker push "scholtz2/a-wallet:$ver-main" || error_code=$?
if [ "$error_code" != "" ]; then
echo "$error_code";
    echo "failed to push";
	exit 1;
fi

echo "Image: scholtz2/a-wallet:$ver-main"