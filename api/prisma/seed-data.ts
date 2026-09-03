/**
 * Base documental jurídica EDUCACIONAL/FICTÍCIA.
 *
 * Todo o conteúdo abaixo é redigido especificamente para este projeto de
 * portfólio. Não reproduz legislação, jurisprudência ou casos reais e não deve
 * ser usado como aconselhamento jurídico. Serve apenas para exercitar retrieval
 * e o workflow do grafo.
 */

export type SeedCategory =
  | 'CONTRACTS'
  | 'DEFAULT_BREACH'
  | 'CIVIL_LIABILITY'
  | 'CIVIL_PROCEDURE'
  | 'CONSUMER';

export interface SeedDocument {
  slug: string;
  title: string;
  category: SeedCategory;
  source: string;
  summary: string;
  chunks: string[];
}

export const seedDocuments: readonly SeedDocument[] = [
  {
    slug: 'principios-gerais-contratos',
    title: 'Princípios gerais dos contratos (material educacional)',
    category: 'CONTRACTS',
    source: 'Compêndio didático fictício — Módulo Contratos',
    summary:
      'Visão geral fictícia sobre formação, função social e boa-fé nos contratos.',
    chunks: [
      'Um contrato, neste material educacional, é o acordo de vontades entre partes capazes que cria, modifica ou extingue obrigações. Sua validade depende de agente capaz, objeto lícito e forma prescrita ou não vedada.',
      'O princípio da boa-fé objetiva orienta a conduta das partes na negociação, na execução e na fase pós-contratual, exigindo lealdade, transparência e cooperação recíproca.',
      'A função social do contrato, neste compêndio fictício, limita a autonomia da vontade ao interesse coletivo, de modo que o pacto não pode ser instrumento de abuso ou de dano a terceiros.',
    ],
  },
  {
    slug: 'requisitos-cobranca-divida-contratual',
    title: 'Requisitos didáticos para cobrança de dívida contratual',
    category: 'CONTRACTS',
    source: 'Compêndio didático fictício — Módulo Contratos',
    summary:
      'Passos ilustrativos para estruturar uma cobrança de dívida contratual.',
    chunks: [
      'Para estruturar uma cobrança de dívida contratual, este material sugere verificar a existência de um título ou prova do acordo, a certeza do valor, o vencimento e a ausência de pagamento.',
      'A liquidez e a certeza da dívida são pressupostos didáticos para uma cobrança consistente: o valor deve ser determinável e a obrigação deve estar comprovada por documento ou por outros meios de prova.',
      'Antes de recorrer à via judicial, o material educacional recomenda a tentativa de solução amigável, o registro das comunicações e a constituição do devedor em mora quando aplicável.',
    ],
  },
  {
    slug: 'obrigacoes-e-inadimplemento',
    title: 'Obrigações e inadimplemento (material educacional)',
    category: 'DEFAULT_BREACH',
    source: 'Compêndio didático fictício — Módulo Obrigações',
    summary:
      'Conceitos fictícios de mora, inadimplemento absoluto e relativo e seus efeitos.',
    chunks: [
      'O inadimplemento, neste material, ocorre quando a obrigação não é cumprida no tempo, lugar e forma devidos. Ele pode ser absoluto, quando a prestação se torna inútil, ou relativo, quando ainda é possível cumprir.',
      'A mora representa o atraso no cumprimento e pode gerar o dever de indenizar os prejuízos decorrentes, além de eventuais juros e correção previstos no acordo entre as partes.',
      'O material didático distingue o devedor em mora do credor em mora, destacando que ambos podem responder por perdas e danos conforme a conduta que deu causa ao descumprimento.',
    ],
  },
  {
    slug: 'responsabilidade-civil-fundamentos',
    title: 'Fundamentos de responsabilidade civil (material educacional)',
    category: 'CIVIL_LIABILITY',
    source: 'Compêndio didático fictício — Módulo Responsabilidade Civil',
    summary:
      'Elementos ilustrativos do dever de indenizar: conduta, dano e nexo causal.',
    chunks: [
      'A responsabilidade civil, neste compêndio fictício, é o dever de reparar um dano causado a outrem. Seus elementos didáticos são a conduta, o dano e o nexo de causalidade entre eles.',
      'A responsabilidade subjetiva depende da demonstração de culpa ou dolo, enquanto a responsabilidade objetiva, em hipóteses específicas, dispensa a prova de culpa e foca no risco da atividade.',
      'O dano indenizável pode ser material, quando atinge o patrimônio, ou moral, quando afeta direitos da personalidade, sempre segundo os limites deste material educacional.',
    ],
  },
  {
    slug: 'processo-civil-fase-conhecimento',
    title: 'Processo civil: noções da fase de conhecimento (educacional)',
    category: 'CIVIL_PROCEDURE',
    source: 'Compêndio didático fictício — Módulo Processo Civil',
    summary:
      'Etapas ilustrativas de um processo, da petição inicial à sentença.',
    chunks: [
      'A fase de conhecimento, neste material educacional, destina-se a apurar os fatos e o direito para que o juiz profira uma sentença. Inicia-se com a petição inicial e a citação do réu.',
      'O contraditório e a ampla defesa são princípios didáticos que asseguram às partes o direito de apresentar alegações e provas antes de uma decisão de mérito.',
      'A produção de provas pode incluir documentos, testemunhas e perícia; ao final da instrução, o juiz avalia o conjunto probatório e decide a lide segundo este compêndio fictício.',
    ],
  },
  {
    slug: 'processo-civil-execucao',
    title: 'Processo civil: noções de execução (educacional)',
    category: 'CIVIL_PROCEDURE',
    source: 'Compêndio didático fictício — Módulo Processo Civil',
    summary: 'Ideia geral fictícia sobre cumprimento de sentença e execução de título.',
    chunks: [
      'A execução, neste material, busca satisfazer um direito já reconhecido em título judicial ou extrajudicial, por meio de atos que compelem o devedor ao cumprimento da obrigação.',
      'Um título executivo, de forma didática, é o documento a que a lei atribui força para autorizar a execução, dispensando nova discussão sobre a existência do direito.',
      'O cumprimento de sentença permite ao credor buscar a satisfação do que foi decidido, podendo alcançar bens do devedor conforme as regras ilustrativas deste compêndio.',
    ],
  },
  {
    slug: 'relacoes-de-consumo-direitos',
    title: 'Relações de consumo: direitos básicos (material educacional)',
    category: 'CONSUMER',
    source: 'Compêndio didático fictício — Módulo Consumidor',
    summary:
      'Direitos ilustrativos do consumidor diante de vícios e informação inadequada.',
    chunks: [
      'Neste material educacional, o consumidor é a pessoa que adquire produto ou serviço como destinatário final, e o fornecedor é quem os disponibiliza no mercado de consumo.',
      'Diante de um vício do produto, o compêndio fictício apresenta como possíveis caminhos a substituição, o abatimento do preço ou a restituição, conforme a situação.',
      'O direito à informação clara e adequada é destacado como pilar didático das relações de consumo, permitindo escolhas conscientes e prevenindo práticas abusivas.',
    ],
  },
];
