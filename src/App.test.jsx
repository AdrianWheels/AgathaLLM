import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial title, buttons, and status', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /Prototipo: 3 Sospechosos \+ 4 Pistas/i,
      })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /Cargar modelo/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Limpiar pistas/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Reset chats/i })
    ).toBeInTheDocument()

    expect(screen.getByText('sin cargar')).toBeInTheDocument()
  })

  it('toggles clues on click', async () => {
    const user = userEvent.setup()
    render(<App />)

    const clueButton = screen.getByRole('button', {
      name: /P2 Cerradura arañada/i,
    })

    expect(clueButton).not.toHaveClass('active')

    await user.click(clueButton)

    expect(clueButton).toHaveClass('active')
  })

  it('sends a question and shows it in chat', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    const chatCards = container.querySelectorAll('.card.chat')
    const firstChat = chatCards[0]
    const chatScope = within(firstChat)

    const input = chatScope.getByPlaceholderText('Escribe tu pregunta…')
    await user.type(input, 'Hola')

    const sendButton = chatScope.getByRole('button', { name: 'Enviar' })
    await user.click(sendButton)

    expect(chatScope.getByText('Hola')).toBeInTheDocument()
  })
})
