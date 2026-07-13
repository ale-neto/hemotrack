# Mission

## O que é
HemoTrack é um projeto de portfólio/estudo: uma aplicação full-stack (Angular 19 + Node/Express + PostgreSQL) que resolve um problema real e pessoal — organizar exames de sangue, visualizar tendências de resultados ao longo do tempo e obter um resumo assistido por IA sobre os números.

## Por que existe
O objetivo primário **não é comercial** — é demonstrar, de ponta a ponta, um domínio sólido de:
- Arquitetura full-stack moderna (Angular standalone components + API REST + WebSocket).
- Integração com múltiplos provedores de IA por trás de uma interface comum (adapter pattern: Gemini / OpenAI / Claude).
- Boas práticas de segurança básicas (JWT, criptografia de chaves de API armazenadas, validação de entrada).
- Geração de artefatos (relatórios em PDF, gráficos de tendência).

Como efeito colateral, a ferramenta também deve ser genuinamente utilizável para o próprio uso pessoal/familiar do autor.

## Para quem é
- Uso primário: o próprio desenvolvedor, como vitrine técnica (código-fonte, decisões de arquitetura, qualidade).
- Uso secundário: uma ou poucas pessoas (ex: família) gerenciando os próprios exames — não é multi-tenant nem voltado a clínicas/profissionais de saúde.

## Princípios norteadores
1. **Simplicidade sobre generalização** — construir para o caso de uso real (indivíduo/família), não para escala hipotética de clínica ou SaaS.
2. **Qualidade de código como parte do produto** — este projeto é o produto final tanto quanto o app em si; clareza de arquitetura importa mais que velocidade de entrega.
3. **IA é assistiva, nunca autoritativa** — os insights gerados são informativos.
4. **Privacidade dos dados de saúde** — chaves de API e dados sensíveis devem ser armazenados de forma criptografada; nenhum dado de exame deve vazar para terceiros além do provedor de IA escolhido explicitamente pelo usuário.

## Não-objetivos
- Não é um sistema multi-paciente/multi-clínica.
- Não substitui diagnóstico ou aconselhamento médico profissional.
- Não busca escalar para milhares de usuários simultâneos; performance/infra enterprise não é prioridade.

## Aviso
Os feedbacks de IA são informativos e **não substituem consulta médica profissional**.
