set dotenv-load := true

default:
    just --list

install:
    npm install

dev:
    npm run dev

build:
    npm run build

preview:
    npm run preview

clean:
    rm -rf dist

reset:
    rm -rf node_modules package-lock.json dist
    npm install
