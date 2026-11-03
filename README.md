# Mini-LightBot

Jogo educativo de navegador feito com HTML, CSS e JavaScript. O jogador monta uma sequência de comandos para guiar o robô pelo tabuleiro; ao encontrar uma lâmpada, precisa responder corretamente a uma pergunta de Tecnologia da Informação para acendê-la.

## Como jogar

1. Abra `index.html` em um navegador atualizado.
2. Escolha um nível disponível.
3. Monte uma sequência com **Frente**, **Direita** e **Esquerda**.
4. Clique em **Executar** para rodar a sequência. O robô só se movimenta por esses comandos.
5. Responda às perguntas para acender todas as lâmpadas e concluir a fase.

O botão **Reiniciar** reposiciona o robô e apaga as lâmpadas da fase atual, sem remover o progresso dos níveis.

## Níveis

| Nível | Lâmpadas |
|---|---:|
| Fácil | 2 |
| Médio | 5 |
| Difícil | 11 |

O nível Médio é desbloqueado após concluir o Fácil; o Difícil, após concluir o Médio. O progresso é salvo localmente no navegador (`localStorage`) e permanece após atualizar a página. O conteúdo não é enviado a um servidor.

As perguntas são separadas por dificuldade, têm alternativas embaralhadas e explicações de feedback. Uma questão não se repete na mesma fase até que todas as questões daquele nível tenham sido usadas.

## Estrutura

- `index.html`: telas, tabuleiro, controles e janelas do jogo.
- `style.css`: identidade visual, animações e regras responsivas.
- `script.js`: comandos, movimento, perguntas, níveis e progresso.
- `assets/`: imagens e recursos do projeto.

Não há dependências ou etapa de compilação. O projeto não possui uma suíte automatizada configurada; mudanças devem ser verificadas no navegador em telas de computador e celular.
