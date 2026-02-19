# 📺 MultiTube

> Visualizador de múltiplas lives em uma única tela.

O **MultiTube** é uma aplicação web leve, rápida e totalmente responsiva que permite assistir a múltiplas transmissões ao vivo simultaneamente.  
Com suporte nativo para **YouTube** e **Kick**, a ferramenta é ideal para acompanhar campeonatos, eventos, ou simplesmente assistir vários streamers ao mesmo tempo — sem perder nenhum detalhe.

---

## ✨ Funcionalidades

### 🔗 Suporte Multiplataforma
Adicione transmissões colando a URL do YouTube ou da Kick.  
A plataforma é detectada automaticamente.

### 🖥️ Layouts Inteligentes
- Grades fixas de **1 a 4 telas**
- Modo automático para **5+ transmissões**
- ⭐ **Modo Destaque**: fixa uma live principal em tamanho ampliado com até 4 lives secundárias organizadas abaixo

### 🎯 Foco Instantâneo
No Modo Destaque, clique no ícone de **alvo** para promover qualquer live à tela principal sem recarregar o vídeo.

### 🖱️ Drag & Drop
Reorganize as transmissões arrastando a barra superior de cada janela.

### 🎚️ Mixer de Áudio
- Controle individual de volume para lives do YouTube
- Botão **Mutar Todos**
- Kick possui controle individual de mute/unmute (limitação da própria plataforma)

### 🔄 Troca Rápida de Live
Substitua uma transmissão específica sem afetar as demais.

### 🎬 Modo Imersivo
O cabeçalho se oculta automaticamente após alguns segundos de inatividade do mouse.

### 💾 Persistência Automática
As lives ativas e o layout escolhido são salvos no navegador via `localStorage`.  
Ao recarregar ou reabrir a página, tudo volta exatamente como estava.

---

## 🚀 Como Usar

### 1️⃣ Adicionar uma Live
Cole um link do:
- YouTube → `youtube.com/watch?v=...`
- Kick → `kick.com/usuario`

Clique em **Adicionar**.

### 2️⃣ Alterar Layout
Use os botões no topo para:
- Forçar grade (1–4)
- Ativar modo automático (5+)
- Alternar para o **Modo Destaque**

### 3️⃣ Reorganizar Janelas
Arraste a barra superior do card para mover a live.

### 4️⃣ Gerenciar Áudio
Abra o **Mixer de Áudio** pelo botão de engrenagem ou use os controles individuais em cada card.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído com foco em performance e simplicidade — **sem necessidade de build tools**.  
Basta abrir o `index.html` no navegador.

- **HTML5** — Estrutura semântica
- **Tailwind CSS (CDN)** — Estilização e responsividade
- **Vanilla JavaScript (ES6+)** — Manipulação de estado, DOM e lógica da aplicação
- **YouTube Iframe API** — Controle e renderização dos players
- **Kick Iframe Embed** — Incorporação nativa das transmissões
- **Lucide Icons** — Ícones open-source
- **Web Storage API (localStorage)** — Persistência de dados

---

## ⚠️ Observações Técnicas

### 🔇 Limitação de Áudio da Kick
Devido às políticas de segurança (CORS e restrições de iframe) da Kick, não é possível controlar o volume via JavaScript externo.  
A solução implementada utiliza parâmetros de URL (`?muted=true/false`) combinados com recarregamento isolado da janela específica.

---

## 🎯 Objetivo

Feito para quem nunca quer perder um momento 🔥

---
