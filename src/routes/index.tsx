import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Diário de Bordo</h1>
      <p className="text-gray-500">foundation rodando.</p>
    </main>
  )
}
