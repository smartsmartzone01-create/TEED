# Commerce Operations interface

Commerce Operations appears as one expandable workspace navigation group with Business Pulse,
products, inventory, sales, returns, expenses, and budgets. The pages reuse the workspace shell,
global form primitives, API error contract, CSRF retry, notifications, and English/Swahili
localization.

The interface follows the operational sequence instead of imitating a spreadsheet. Business
Pulse separates live state cards from the actionable Decision Inbox. Forms remain short and
update dependent records on the server: receiving stock changes availability, recording a sale
performs FIFO allocation, and recording a sellable return restores inventory.
