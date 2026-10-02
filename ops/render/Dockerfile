FROM debian:bookworm-slim
# Check https://github.com/writefreely/writefreely/releases for the newest version
ARG WF_VERSION=0.15.0
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSL "https://github.com/writefreely/writefreely/releases/download/v${WF_VERSION}/writefreely_${WF_VERSION}_linux_amd64.tar.gz" | tar -xz -C / \
 && ls /writefreely/writefreely
WORKDIR /writefreely
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
