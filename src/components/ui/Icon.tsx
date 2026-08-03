import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
  IconWeight,
} from '@phosphor-icons/react'
import { BasketIcon } from '@phosphor-icons/react/dist/csr/Basket'
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase'
import { BroomIcon } from '@phosphor-icons/react/dist/csr/Broom'
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank'
import { CarIcon } from '@phosphor-icons/react/dist/csr/Car'
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText'
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock'
import { ConfettiIcon } from '@phosphor-icons/react/dist/csr/Confetti'
import { CookingPotIcon } from '@phosphor-icons/react/dist/csr/CookingPot'
import { DotsThreeIcon } from '@phosphor-icons/react/dist/csr/DotsThree'
import { ForkKnifeIcon } from '@phosphor-icons/react/dist/csr/ForkKnife'
import { HeartIcon } from '@phosphor-icons/react/dist/csr/Heart'
import { HouseLineIcon } from '@phosphor-icons/react/dist/csr/HouseLine'
import { LeafIcon } from '@phosphor-icons/react/dist/csr/Leaf'
import { ListChecksIcon } from '@phosphor-icons/react/dist/csr/ListChecks'
import { LockSimpleIcon } from '@phosphor-icons/react/dist/csr/LockSimple'
import { MapTrifoldIcon } from '@phosphor-icons/react/dist/csr/MapTrifold'
import { PawPrintIcon } from '@phosphor-icons/react/dist/csr/PawPrint'
import { PillIcon } from '@phosphor-icons/react/dist/csr/Pill'
import { PlantIcon } from '@phosphor-icons/react/dist/csr/Plant'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse'
import { ReceiptIcon } from '@phosphor-icons/react/dist/csr/Receipt'
import { ShapesIcon } from '@phosphor-icons/react/dist/csr/Shapes'
import { ShoppingBagOpenIcon } from '@phosphor-icons/react/dist/csr/ShoppingBagOpen'
import { SlidersHorizontalIcon } from '@phosphor-icons/react/dist/csr/SlidersHorizontal'
import { SparkleIcon } from '@phosphor-icons/react/dist/csr/Sparkle'
import { TagIcon } from '@phosphor-icons/react/dist/csr/Tag'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import { TrayIcon } from '@phosphor-icons/react/dist/csr/Tray'
import { UserIcon } from '@phosphor-icons/react/dist/csr/User'
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree'
import { WashingMachineIcon } from '@phosphor-icons/react/dist/csr/WashingMachine'
import { WrenchIcon } from '@phosphor-icons/react/dist/csr/Wrench'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'

export type IconName =
  | 'activity'
  | 'basket'
  | 'briefcase'
  | 'broom'
  | 'calendar'
  | 'car'
  | 'check'
  | 'chevron-right'
  | 'clipboard'
  | 'clock'
  | 'confetti'
  | 'cooking-pot'
  | 'heart'
  | 'home'
  | 'inbox'
  | 'leaf'
  | 'list'
  | 'lock'
  | 'map'
  | 'more'
  | 'paw'
  | 'pill'
  | 'plant'
  | 'plus'
  | 'receipt'
  | 'settings'
  | 'shapes'
  | 'shopping-bag'
  | 'spark'
  | 'tag'
  | 'trash'
  | 'user'
  | 'users'
  | 'utensils'
  | 'washing-machine'
  | 'wrench'
  | 'x'

type IconProps = Omit<PhosphorIconProps, 'size' | 'weight'> & {
  name: IconName
  size?: number | string
  weight?: IconWeight
}

const icons: Record<IconName, PhosphorIcon> = {
  activity: PulseIcon,
  basket: BasketIcon,
  briefcase: BriefcaseIcon,
  broom: BroomIcon,
  calendar: CalendarBlankIcon,
  car: CarIcon,
  check: CheckIcon,
  'chevron-right': CaretRightIcon,
  clipboard: ClipboardTextIcon,
  clock: ClockIcon,
  confetti: ConfettiIcon,
  'cooking-pot': CookingPotIcon,
  heart: HeartIcon,
  home: HouseLineIcon,
  inbox: TrayIcon,
  leaf: LeafIcon,
  list: ListChecksIcon,
  lock: LockSimpleIcon,
  map: MapTrifoldIcon,
  more: DotsThreeIcon,
  paw: PawPrintIcon,
  pill: PillIcon,
  plant: PlantIcon,
  plus: PlusIcon,
  receipt: ReceiptIcon,
  settings: SlidersHorizontalIcon,
  shapes: ShapesIcon,
  'shopping-bag': ShoppingBagOpenIcon,
  spark: SparkleIcon,
  tag: TagIcon,
  trash: TrashIcon,
  user: UserIcon,
  users: UsersThreeIcon,
  utensils: ForkKnifeIcon,
  'washing-machine': WashingMachineIcon,
  wrench: WrenchIcon,
  x: XIcon,
}

export function Icon({ name, size = 20, weight = 'regular', ...props }: IconProps) {
  const Glyph = icons[name]
  const isLabelled = Boolean(props['aria-label'] ?? props.alt)

  return (
    <Glyph
      aria-hidden={isLabelled ? undefined : 'true'}
      color="currentColor"
      focusable="false"
      size={size}
      weight={weight}
      {...props}
    />
  )
}
