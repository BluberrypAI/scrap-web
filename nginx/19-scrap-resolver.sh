#!/bin/sh
set -eu

# Docker와 Azure가 제공하는 실제 DNS를 사용한다. Docker 전용 IP를 하드코딩하지 않는다.
scrap_resolver=$(awk '$1 == "nameserver" { print $2; exit }' /etc/resolv.conf)
if [ -z "$scrap_resolver" ]; then
    echo "SCRAP: container DNS resolver is missing" >&2
    exit 1
fi
case "$scrap_resolver" in
    *:*) scrap_resolver="[$scrap_resolver]" ;;
esac
printf 'resolver %s valid=10s ipv6=off;\n' "$scrap_resolver" > /etc/nginx/conf.d/00-scrap-resolver.conf
