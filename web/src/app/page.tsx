export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 'var(--page-max-width)',
        margin: '0 auto',
        padding: 'var(--spacing-80) var(--spacing-24)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--text-heading-lg)',
          fontWeight: 'var(--font-weight-medium)',
          letterSpacing: '-0.73px',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        Mini Legal Graph
      </h1>
      <p
        style={{
          color: 'var(--color-pale-lilac)',
          fontSize: 'var(--text-subheading)',
          marginTop: 'var(--spacing-24)',
          maxWidth: 640,
          marginInline: 'auto',
        }}
      >
        Assistente de triagem jurídica educacional que demonstra o LangGraph como
        orquestrador de um workflow com estado, decisões condicionais e verificação
        de evidências.
      </p>
      <p
        style={{
          color: 'var(--color-ash)',
          fontSize: 'var(--text-caption)',
          marginTop: 'var(--spacing-32)',
        }}
      >
        Projeto educacional. Não constitui aconselhamento jurídico profissional.
      </p>
    </main>
  );
}
