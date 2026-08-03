import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskIcon } from './TaskIcon'

describe('TaskIcon', () => {
  it('uses the assignee for color while the category controls the glyph', () => {
    const { container, rerender } = render(<TaskIcon assigneeColor="pink" categoryName="Laundry" />)
    const firstMarkup = container.innerHTML

    expect(container.firstElementChild).toHaveAttribute('data-assignee-color', 'pink')

    rerender(<TaskIcon assigneeColor="pink" categoryName="Pets" />)

    expect(container.firstElementChild).toHaveAttribute('data-assignee-color', 'pink')
    expect(container.innerHTML).not.toBe(firstMarkup)
  })

  it('renders the reserved neutral treatment for unassigned work', () => {
    const { container } = render(<TaskIcon assigneeColor="unassigned" categoryName="Cleaning" />)
    expect(container.firstElementChild).toHaveAttribute('data-assignee-color', 'unassigned')
  })
})
