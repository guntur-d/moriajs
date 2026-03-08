# @moriajs/ui

A collection of premium UI components for MoriaJS apps.

## Components

- **Toast**: Beautiful notifications (`toast`, `Toaster`).
- **Modal**: Interactive modal dialogs with smooth animations.
- **Confirmation**: Imperative confirmation dialogs (`confirm`, `ConfirmationRegistry`).
- **MoriaUI**: Aggregate export for easy discovery.

## Usage

### 1. Root Setup

Mount the `Toaster` and `ConfirmationRegistry` once in your application's root layout to enable global notifications and confirmations.

```ts
import m from 'mithril';
import { Toaster, ConfirmationRegistry } from '@moriajs/ui';

const Layout = {
  view(vnode) {
    return m('div', [
      m(Toaster),
      m(ConfirmationRegistry),
      m('main', vnode.children),
    ]);
  }
};
```

### 2. Notifications

```ts
import { toast } from '@moriajs/ui';

toast.success('Project saved!');
toast.error('Connection failed');
```

### 3. Confirmations (Imperative)

The `confirm()` utility returns a Promise that resolves to `true` if the user confirms, and `false` if they cancel or close the modal.

```ts
import { confirm } from '@moriajs/ui';

async function handleDelete() {
  const confirmed = await confirm({
    title: 'Delete everything?',
    message: 'This action is irreversible. Continue?',
    confirmText: 'Yes, delete it',
    cancelText: 'No, wait',
    type: 'danger',
  });

  if (confirmed) {
    // Perform deletion...
  }
}
```

### 4. Modal (Declarative)

```ts
import { Modal } from '@moriajs/ui';

let isOpen = false;

m(Modal, {
  isOpen,
  title: 'Information',
  onClose: () => { isOpen = false; },
}, [
  m('p', 'This is a declarative modal.'),
]);
```
