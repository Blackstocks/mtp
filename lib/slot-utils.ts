import { Slot } from '@/types/db'

/**
 * Format slot code for display with proper brackets
 * Examples:
 * - code: "A3", occ: 1 -> "A3(1)"
 * - code: "A3", occ: 12 -> "A3(1, 2)"
 * - code: "LAB", cluster: "Q" -> "LAB-Q"
 * - code: "D4", occ: 99 -> "D4(4h)"
 * - code: "H2", occ: 1 -> "H2"
 */
export function formatSlotDisplay(slot: Slot): string {
  // Handle LAB slots
  if (slot.code === 'LAB' && slot.cluster) {
    return `LAB-${slot.cluster}`
  }
  
  // Handle special H2 case (no brackets)
  if (slot.code === 'H2') {
    return 'H2'
  }
  
  // Handle 4h special case
  if (slot.occ === 99) {
    return `${slot.code}(4h)`
  }
  
  // Handle combined slots like 12, 23, 34 -> "1, 2", "2, 3", "3, 4"
  if (slot.occ > 10 && slot.occ < 99) {
    const first = Math.floor(slot.occ / 10)
    const second = slot.occ % 10
    return `${slot.code}(${first}, ${second})`
  }
  
  // Handle slots that don't need occ display (A2, B2, etc with occ=1)
  if (slot.code.endsWith('2') && slot.occ === 1) {
    return slot.code
  }
  
  // Default case - show occ in brackets
  return `${slot.code}(${slot.occ})`
}

/**
 * Get a short display version (for compact views)
 */
export function formatSlotShort(slot: Slot): string {
  // For LAB slots, just show the cluster
  if (slot.code === 'LAB' && slot.cluster) {
    return slot.cluster
  }
  
  // For others, show full format
  return formatSlotDisplay(slot)
}