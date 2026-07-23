SHELL := /bin/sh

COMPOSE ?= docker compose

.PHONY: help init up down restart recreate ps logs

help:
	@echo "Targets disponiveis:"
	@echo "  make up       - sobe o servico da FDA API"
	@echo "  make down     - derruba os containers"
	@echo "  make restart  - reinicia os containers"
	@echo "  make recreate - forca recriacao dos containers (--force-recreate)"
	@echo "  make ps       - mostra status dos servicos"
	@echo "  make logs     - logs da FDA API"

init:
	@mkdir -p uploads
	@echo "Estrutura criada."

up: init
	@$(COMPOSE) up -d

down:
	@$(COMPOSE) down

restart:
	@$(COMPOSE) restart

recreate: init
	@$(COMPOSE) up -d --build

ps:
	@$(COMPOSE) ps

logs:
	@$(COMPOSE) logs -f fda-api
