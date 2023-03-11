FROM node:18 AS build
WORKDIR /src
COPY . .
RUN npm install
RUN npm audit fix --save &>/dev/null
RUN npm run build
RUN cd /src/dist && ls
#RUN npm run test

FROM nginxinc/nginx-unprivileged:latest
USER root
ENV DEBIAN_FRONTEND noninteractive
RUN apt update && apt dist-upgrade -y && apt install -y mc wget telnet git curl iotop atop vim && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/
RUN mkdir /app
COPY docker/default.conf /etc/nginx/conf.d/default.conf
RUN chown nginx:nginx /etc/nginx/conf.d -R
RUN chmod 0600 /etc/nginx/conf.d -R
RUN chmod 0700 /etc/nginx/conf.d
USER nginx
WORKDIR /app
COPY --from=build /src/dist .
RUN pwd && ls