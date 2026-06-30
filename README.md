# Jogo da Memória

Implementação do clássico Jogo da Memória em **JavaScript puro**, sem frameworks ou dependências externas. Tema visual inspirado em terminais de reconhecimento retrô — mesma identidade visual do [Campo Minado](https://github.com/).

🎮 [Jogar online](#) — *substitua pelo link do GitHub Pages após o deploy*

## Funcionalidades

- Três níveis de dificuldade: fácil (4×4, 8 pares), médio (6×6, 18 pares) e difícil (6×10, 30 pares)
- Animação de flip 3D nas cartas via CSS `transform: rotateY`
- Embaralhamento com algoritmo Fisher-Yates
- Símbolos únicos com cor exclusiva por par, facilitando o reconhecimento visual
- Contador de jogadas e progresso de pares encontrados
- Bloqueio de clique durante a animação de não-par (evita clicar rápido para trapacear)
- Totalmente navegável por teclado (Tab para mover entre cartas, Enter/Espaço para virar)
- Responsivo e com suporte a `prefers-reduced-motion`

## Tecnologias

- HTML5
- CSS3 (variáveis CSS, grid layout, `transform`, `perspective`)
- JavaScript (ES6+, sem bibliotecas)

## Como rodar localmente

Não há etapa de build. Basta abrir o arquivo `index.html` no navegador, ou rodar um servidor local simples:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Depois acesse `http://localhost:8000`.

## Estrutura do projeto

```
memory-game/
├── index.html   # estrutura da página
├── style.css    # estilos e tema visual
├── script.js    # lógica do jogo
└── README.md
```

## Lógica do jogo

A lógica principal está em `script.js` e cobre:

- **Geração do baralho**: `pairs` símbolos únicos são selecionados aleatoriamente de um pool de 30, duplicados e embaralhados com Fisher-Yates
- **Flip e comparação**: ao virar duas cartas, o jogo compara os símbolos; se iguais, marca como encontradas; se diferentes, vira de volta após 900ms
- **Bloqueio de clique**: a variável `locked` impede interação enquanto a animação de não-par está em andamento
- **Condição de vitória**: quando `matched === totalPairs`, o overlay de parabéns é exibido

## Possíveis melhorias futuras

- Cronômetro por partida e ranking de melhores tempos
- Modo com imagens no lugar de símbolos (ex: bandeiras de países, escudos de times)
- Animação de "shake" nas cartas que não formaram par
- Dificuldade customizável (número de pares definido pelo usuário)

## Licença

Livre para uso e modificação.
# memory-game
