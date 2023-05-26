import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MAX_PAGES, PageRecordType, TLPageId, useApp } from '@tldraw/editor'
import { useCallback } from 'react'
import { track } from 'signia-react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'
import * as M from '../primitives/DropdownMenu'
import { onMovePage } from './edit-pages-shared'

export interface PageItemSubmenuProps {
	index: number
	item: { id: string; name: string }
	listSize: number
	onRename?: () => void
}

export const PageItemSubmenu = track(function PageItemSubmenu({
	index,
	listSize,
	item,
	onRename,
}: PageItemSubmenuProps) {
	const app = useApp()
	const msg = useTranslation()
	const pages = app.pages

	const onDuplicate = useCallback(() => {
		app.mark('creating page')
		const newId = PageRecordType.createId()
		app.duplicatePage(item.id as TLPageId, newId)
	}, [app, item])

	const onMoveUp = useCallback(() => {
		onMovePage(app, item.id as TLPageId, index, index - 1)
	}, [app, item, index])

	const onMoveDown = useCallback(() => {
		onMovePage(app, item.id as TLPageId, index, index + 1)
	}, [app, item, index])

	const onDelete = useCallback(() => {
		app.mark('deleting page')
		app.deletePage(item.id as TLPageId)
	}, [app, item])

	return (
		<M.Root id={`page item submenu ${index}`}>
			<M.Trigger>
				<Button title={msg('page-menu.submenu.title')} icon="dots-vertical" />
			</M.Trigger>
			<M.Content alignOffset={0}>
				<M.Group>
					{onRename && (
						<DropdownMenu.Item dir="ltr" onSelect={onRename} asChild>
							<Button className="tlui-menu__button" label="page-menu.submenu.rename" />
						</DropdownMenu.Item>
					)}
					<DropdownMenu.Item
						dir="ltr"
						onSelect={onDuplicate}
						disabled={pages.length >= MAX_PAGES}
						asChild
					>
						<Button className="tlui-menu__button" label="page-menu.submenu.duplicate-page" />
					</DropdownMenu.Item>
					{index > 0 && (
						<DropdownMenu.Item dir="ltr" onSelect={onMoveUp} asChild>
							<Button className="tlui-menu__button" label="page-menu.submenu.move-up" />
						</DropdownMenu.Item>
					)}
					{index < listSize - 1 && (
						<DropdownMenu.Item dir="ltr" onSelect={onMoveDown} asChild>
							<Button className="tlui-menu__button" label="page-menu.submenu.move-down" />
						</DropdownMenu.Item>
					)}
				</M.Group>
				{listSize > 1 && (
					<M.Group>
						<DropdownMenu.Item dir="ltr" onSelect={onDelete} asChild>
							<Button className="tlui-menu__button" label="page-menu.submenu.delete" />
						</DropdownMenu.Item>
					</M.Group>
				)}
			</M.Content>
		</M.Root>
	)
})
