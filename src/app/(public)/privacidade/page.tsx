import type { Metadata } from 'next';

/**
 * Política de Privacidade — página pública (sem auth).
 *
 * Esta página é pré-requisito do App Review da Meta para o app `bullq`
 * (ver INSTAGRAM-APP-REVIEW-PLAN.md, Etapas 2 e 3). A URL pública
 * `bullq.iacombativa.com/privacidade` é o que se informa no painel da Meta
 * como "Política de Privacidade"; a seção #exclusao-de-dados é o destino
 * do campo "Data Deletion Instructions URL".
 *
 * É deliberadamente auto-contida (cores explícitas, server component, zero
 * dependência do sistema de temas brand A/B/C) para renderizar idêntica
 * para qualquer visitante — incluindo o revisor da Meta, deslogado.
 *
 * Revisão jurídica do Doc (2026-05-20): controlador (razão social + CNPJ),
 * e-mail de contato, Encarregado/DPO e prazo de retenção (5 anos) — todos
 * confirmados. Página completa, sem placeholders.
 */

const CONTROLADOR = {
  razaoSocial: 'Luis Augusto Sbroggio Lacanna — Sociedade Individual de Advocacia',
  nomeFantasia: 'Sbroggio Advocacia Empresarial & Franchising',
  cnpj: 'CNPJ 36.589.512/0001-82',
  cidade: 'São José do Rio Preto / SP — Brasil',
  email: 'luis@sbroggio.io',
  encarregado: 'Luis Augusto Sbroggio Lacanna — OAB/SP 323.065',
};

const ATUALIZADO_EM = '20 de maio de 2026';

export const metadata: Metadata = {
  title: 'Política de Privacidade · bullq',
  description:
    'Como o bullq trata dados pessoais ao integrar canais de atendimento como Instagram Direct e WhatsApp, em conformidade com a LGPD.',
  robots: { index: true, follow: true },
};

const SUMARIO = [
  { id: 'controlador', label: '1. Quem é o controlador' },
  { id: 'o-que-cobre', label: '2. O que é o bullq e o escopo desta política' },
  { id: 'dados', label: '3. Dados pessoais que tratamos' },
  { id: 'origem', label: '4. De onde vêm esses dados' },
  { id: 'finalidades', label: '5. Para que usamos os dados' },
  { id: 'base-legal', label: '6. Base legal do tratamento' },
  { id: 'dados-meta', label: '7. Uso de dados da plataforma da Meta' },
  { id: 'compartilhamento', label: '8. Com quem compartilhamos' },
  { id: 'retencao', label: '9. Por quanto tempo guardamos' },
  { id: 'direitos', label: '10. Seus direitos como titular' },
  { id: 'exclusao-de-dados', label: '11. Como excluir seus dados' },
  { id: 'seguranca', label: '12. Segurança da informação' },
  { id: 'cookies', label: '13. Cookies e tecnologias semelhantes' },
  { id: 'alteracoes', label: '14. Alterações nesta política' },
  { id: 'contato', label: '15. Contato e Encarregado (DPO)' },
];

/** Título de seção com âncora navegável e offset de scroll. */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-xl font-semibold tracking-tight text-[#1c2740] sm:text-2xl"
    >
      {children}
    </h2>
  );
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-700 antialiased">
      <div className="mx-auto max-w-3xl px-6 py-14 sm:px-8 sm:py-20">
        {/* ── Cabeçalho ── */}
        <header className="border-b border-slate-200 pb-10">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-[#1c2740]">bullq</span>
            <span aria-hidden className="h-4 w-px bg-slate-300" />
            <span className="text-sm text-slate-500">{CONTROLADOR.nomeFantasia}</span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#1c2740] sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Esta política explica, de forma clara, quais dados pessoais o bullq trata,
            por que os trata, com quem os compartilha e como você pode exercer seus
            direitos, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018 — LGPD).
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Última atualização: <strong className="text-slate-700">{ATUALIZADO_EM}</strong>
          </p>
        </header>

        {/* ── Sumário ── */}
        <nav aria-label="Sumário" className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            Sumário
          </p>
          <ol className="mt-4 space-y-2">
            {SUMARIO.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-sm text-slate-600 underline-offset-2 transition hover:text-[#c75230] hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── Conteúdo ── */}
        <div className="mt-12 space-y-12 text-[15px] leading-relaxed">
          {/* 1 */}
          <section className="space-y-3">
            <SectionHeading id="controlador">1. Quem é o controlador dos dados</SectionHeading>
            <p>
              O controlador dos dados pessoais tratados por meio do bullq é{' '}
              <strong className="text-slate-800">{CONTROLADOR.razaoSocial}</strong> ({CONTROLADOR.cnpj}),
              que atua sob o nome <strong className="text-slate-800">{CONTROLADOR.nomeFantasia}</strong>,
              estabelecido em {CONTROLADOR.cidade}. O controlador é a parte que decide
              sobre as finalidades e os meios do tratamento dos dados descritos nesta
              política.
            </p>
            <p>
              Para qualquer assunto relacionado a privacidade e proteção de dados,
              entre em contato pelo e-mail{' '}
              <a
                href={`mailto:${CONTROLADOR.email}`}
                className="font-medium text-[#c75230] underline underline-offset-2"
              >
                {CONTROLADOR.email}
              </a>
              .
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <SectionHeading id="o-que-cobre">
              2. O que é o bullq e o escopo desta política
            </SectionHeading>
            <p>
              O bullq é uma ferramenta de atendimento omnichannel: ele reúne, em uma
              única caixa de entrada, as conversas que uma empresa mantém com seus
              clientes em diferentes canais — entre eles o <strong>Instagram Direct</strong>{' '}
              e o <strong>WhatsApp</strong>. O objetivo é permitir que a equipe de
              atendimento receba, organize e responda mensagens de forma eficiente.
            </p>
            <p>
              Esta política cobre o tratamento de dados realizado pela plataforma bullq
              ao conectar esses canais. Ela não substitui as políticas de privacidade da
              Meta Platforms (Instagram e WhatsApp), que regem o uso desses aplicativos
              pelos próprios usuários.
            </p>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <SectionHeading id="dados">3. Dados pessoais que tratamos</SectionHeading>
            <p>Ao conectar um canal de atendimento ao bullq, podemos tratar:</p>
            <ul className="ml-1 space-y-2">
              {[
                ['Conteúdo das mensagens', 'o texto, imagens, áudios e arquivos trocados entre o cliente e a empresa nas conversas de atendimento.'],
                ['Dados de perfil público', 'nome de exibição, nome de usuário (@), foto de perfil e identificador da conta do cliente no Instagram ou WhatsApp.'],
                ['Metadados da conversa', 'data e hora das mensagens, canal de origem, status de leitura e identificadores técnicos da conversa.'],
                ['Dados da conta da empresa', 'as credenciais e identificadores das contas comerciais que a própria empresa conecta ao bullq para operar o atendimento.'],
              ].map(([titulo, desc]) => (
                <li key={titulo} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                  <span>
                    <strong className="text-slate-800">{titulo}:</strong> {desc}
                  </span>
                </li>
              ))}
            </ul>
            <p>
              O bullq <strong>não</strong> coleta deliberadamente dados pessoais
              sensíveis. Caso um cliente envie esse tipo de informação no conteúdo de
              uma mensagem, ela será tratada apenas como parte do histórico de
              atendimento e protegida nos mesmos termos desta política.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <SectionHeading id="origem">4. De onde vêm esses dados</SectionHeading>
            <p>
              Os dados chegam ao bullq exclusivamente por meio das{' '}
              <strong>APIs oficiais</strong> dos provedores de cada canal:
            </p>
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                <span>
                  <strong className="text-slate-800">Instagram Direct:</strong> via a
                  API oficial do Instagram (Meta Platforms), após a empresa autorizar a
                  conexão da sua conta comercial. As mensagens são entregues ao bullq
                  por <em>webhooks</em> e por consultas autenticadas à API.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                <span>
                  <strong className="text-slate-800">WhatsApp:</strong> via integração
                  oficial de mensageria, também mediante autorização da empresa.
                </span>
              </li>
            </ul>
            <p>
              Não compramos listas de dados nem coletamos informações de fontes não
              autorizadas. O acesso só existe enquanto a empresa mantiver a conexão
              ativa e a autorização válida.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <SectionHeading id="finalidades">5. Para que usamos os dados</SectionHeading>
            <p>Tratamos os dados pessoais com as seguintes finalidades, e nenhuma outra:</p>
            <ul className="ml-1 space-y-2">
              {[
                'Exibir as conversas em uma caixa de entrada unificada para a equipe de atendimento.',
                'Permitir que atendentes leiam e respondam as mensagens dos clientes.',
                'Mostrar o nome e a foto do contato para que o atendente identifique com quem fala.',
                'Organizar o atendimento — atribuir conversas, marcar status, registrar histórico.',
                'Garantir a segurança e o bom funcionamento da plataforma.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              <strong>Não</strong> usamos o conteúdo das conversas para publicidade,
              não vendemos dados pessoais e não os disponibilizamos a terceiros para
              finalidades próprias deles.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <SectionHeading id="base-legal">6. Base legal do tratamento</SectionHeading>
            <p>
              O tratamento dos dados se apoia nas hipóteses legais da LGPD (art. 7º):
            </p>
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                <span>
                  <strong className="text-slate-800">Execução de contrato</strong> (art.
                  7º, V) — o tratamento é necessário para prestar o serviço de
                  atendimento contratado pela empresa que usa o bullq.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                <span>
                  <strong className="text-slate-800">Legítimo interesse</strong> (art.
                  7º, IX) — para responder a quem procura espontaneamente a empresa por
                  mensagem, sempre respeitando as legítimas expectativas do titular.
                </span>
              </li>
            </ul>
          </section>

          {/* 7 — Meta-specific compliance statement */}
          <section className="space-y-3">
            <SectionHeading id="dados-meta">
              7. Uso de dados obtidos da plataforma da Meta
            </SectionHeading>
            <p>
              Quando uma empresa conecta uma conta do Instagram ao bullq, obtemos da
              plataforma da Meta apenas os dados estritamente necessários ao
              atendimento, por meio das permissões abaixo:
            </p>
            <ul className="ml-1 space-y-2">
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                <span>
                  <strong className="text-slate-800">instagram_business_basic</strong> —
                  para exibir o nome e a foto de perfil do contato na caixa de entrada,
                  permitindo que o atendente o identifique.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                <span>
                  <strong className="text-slate-800">
                    instagram_business_manage_messages
                  </strong>{' '}
                  — para receber as mensagens diretas enviadas à conta da empresa e
                  permitir que o atendente as responda pelo bullq.
                </span>
              </li>
            </ul>
            <p>
              Os dados obtidos da plataforma da Meta são usados <strong>somente</strong>{' '}
              para as finalidades de atendimento descritas nesta política. Não os
              transferimos a terceiros para finalidades de publicidade e não os usamos
              para construir perfis de marketing. O tratamento observa as Políticas da
              Plataforma e os Termos para Desenvolvedores da Meta.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <SectionHeading id="compartilhamento">
              8. Com quem compartilhamos os dados
            </SectionHeading>
            <p>O compartilhamento se limita ao necessário para operar o serviço:</p>
            <ul className="ml-1 space-y-2">
              {[
                ['A empresa que usa o bullq', 'os dados das conversas ficam acessíveis à equipe de atendimento da própria empresa que conectou o canal — é ela quem opera o atendimento.'],
                ['Provedores de infraestrutura', 'serviços de hospedagem, banco de dados e processamento que viabilizam a plataforma, sob obrigação contratual de confidencialidade e segurança.'],
                ['Meta Platforms', 'as respostas enviadas pelo atendente trafegam de volta pela API oficial para serem entregues ao cliente no Instagram ou WhatsApp.'],
                ['Autoridades', 'quando houver obrigação legal, regulatória ou ordem judicial que exija a divulgação.'],
              ].map(([titulo, desc]) => (
                <li key={titulo} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                  <span>
                    <strong className="text-slate-800">{titulo}:</strong> {desc}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <SectionHeading id="retencao">9. Por quanto tempo guardamos os dados</SectionHeading>
            <p>
              Os dados de atendimento são mantidos enquanto durar a relação entre a
              empresa e o cliente e pelo período em que forem necessários às
              finalidades desta política. Como regra geral, o histórico de conversas é
              conservado por até <strong>5 (cinco) anos</strong> após o último contato,
              salvo quando uma obrigação legal exigir prazo de guarda diferente.
            </p>
            <p>
              Encerrado o prazo aplicável — ou atendido um pedido de exclusão (seção
              11) — os dados são eliminados ou anonimizados de forma segura.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <SectionHeading id="direitos">10. Seus direitos como titular</SectionHeading>
            <p>
              A LGPD (art. 18) garante a você, titular dos dados, o direito de solicitar
              a qualquer momento:
            </p>
            <ul className="ml-1 space-y-2">
              {[
                'Confirmação de que tratamos seus dados e acesso a eles.',
                'Correção de dados incompletos, inexatos ou desatualizados.',
                'Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei.',
                'Portabilidade dos dados a outro fornecedor, mediante requisição.',
                'Eliminação dos dados tratados com base no seu consentimento.',
                'Informação sobre com quem compartilhamos seus dados.',
                'Revogação do consentimento, quando o tratamento se basear nele.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c75230]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Para exercer qualquer um desses direitos, escreva para{' '}
              <a
                href={`mailto:${CONTROLADOR.email}`}
                className="font-medium text-[#c75230] underline underline-offset-2"
              >
                {CONTROLADOR.email}
              </a>
              . Responderemos no menor prazo possível.
            </p>
          </section>

          {/* 11 — Data Deletion — destino do "Data Deletion URL" da Meta */}
          <section className="space-y-3">
            <SectionHeading id="exclusao-de-dados">11. Como excluir seus dados</SectionHeading>
            <div className="rounded-xl border border-[#c75230]/30 bg-[#c75230]/[0.06] p-6">
              <p className="font-medium text-[#1c2740]">
                Você pode pedir a exclusão dos seus dados pessoais a qualquer momento.
              </p>
              <p className="mt-3">
                Para solicitar a remoção das suas informações tratadas pelo bullq —
                incluindo as conversas e o perfil obtidos do Instagram ou do WhatsApp —
                siga estes passos:
              </p>
              <ol className="mt-4 space-y-3">
                {[
                  ['Envie um e-mail', <>para <a href={`mailto:${CONTROLADOR.email}?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados`} className="font-medium text-[#c75230] underline underline-offset-2">{CONTROLADOR.email}</a> com o assunto <strong>“Solicitação de exclusão de dados”</strong>.</>],
                  ['Identifique-se', <>informe o nome de usuário (@) ou o número usado no canal de atendimento, para localizarmos seus dados.</>],
                  ['Confirmação', <>confirmamos o recebimento e, após verificar a identidade, eliminamos ou anonimizamos seus dados em até <strong>30 dias</strong>.</>],
                  ['Aviso de conclusão', <>você recebe um e-mail confirmando que a exclusão foi concluída.</>],
                ].map(([titulo, desc], i) => (
                  <li key={titulo as string} className="flex gap-3">
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c75230] text-xs font-semibold text-white"
                    >
                      {i + 1}
                    </span>
                    <span>
                      <strong className="text-slate-800">{titulo}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-slate-600">
                Poderemos reter o estritamente necessário para cumprir obrigações
                legais; nesse caso, o restante dos dados é eliminado e o que permanecer
                fica protegido e fora de uso para qualquer outra finalidade.
              </p>
            </div>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <SectionHeading id="seguranca">12. Segurança da informação</SectionHeading>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger os dados contra
              acesso não autorizado, perda ou alteração indevida — entre elas,
              criptografia do tráfego (HTTPS), controle de acesso por autenticação,
              isolamento de dados por organização e registro de atividades. O acesso
              aos dados de atendimento é restrito à equipe da empresa que conectou o
              canal e ao pessoal técnico estritamente necessário à operação da
              plataforma.
            </p>
          </section>

          {/* 13 */}
          <section className="space-y-3">
            <SectionHeading id="cookies">13. Cookies e tecnologias semelhantes</SectionHeading>
            <p>
              A aplicação bullq utiliza cookies e armazenamento local apenas para fins
              essenciais de funcionamento — manter a sessão do usuário autenticado e
              guardar preferências de interface. Não empregamos cookies de publicidade
              nem de rastreamento de terceiros.
            </p>
          </section>

          {/* 14 */}
          <section className="space-y-3">
            <SectionHeading id="alteracoes">14. Alterações nesta política</SectionHeading>
            <p>
              Esta política pode ser atualizada para refletir mudanças legais,
              técnicas ou de funcionamento do serviço. Quando isso ocorrer, a data de
              “Última atualização” no topo desta página será revista. Recomendamos a
              consulta periódica.
            </p>
          </section>

          {/* 15 */}
          <section className="space-y-3">
            <SectionHeading id="contato">15. Contato e Encarregado (DPO)</SectionHeading>
            <p>
              Dúvidas, solicitações ou reclamações sobre o tratamento de dados podem
              ser dirigidas ao Encarregado pelo Tratamento de Dados Pessoais:
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
              <p className="font-medium text-slate-800">{CONTROLADOR.encarregado}</p>
              <p className="mt-1 text-slate-600">{CONTROLADOR.razaoSocial}</p>
              <p className="text-slate-600">{CONTROLADOR.cnpj}</p>
              <p className="text-slate-600">{CONTROLADOR.cidade}</p>
              <p className="mt-2">
                <a
                  href={`mailto:${CONTROLADOR.email}`}
                  className="font-medium text-[#c75230] underline underline-offset-2"
                >
                  {CONTROLADOR.email}
                </a>
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Você também pode apresentar reclamação à Autoridade Nacional de Proteção
              de Dados (ANPD).
            </p>
          </section>
        </div>

        {/* ── Rodapé ── */}
        <footer className="mt-16 border-t border-slate-200 pt-8 text-xs leading-relaxed text-slate-400">
          <p>
            © {new Date().getFullYear()} {CONTROLADOR.razaoSocial}. bullq — plataforma
            de atendimento omnichannel.
          </p>
        </footer>
      </div>
    </main>
  );
}
