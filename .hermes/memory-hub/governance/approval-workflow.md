# Approval Workflow

1. **Identification**: Flag the change as mutation-sensitive.
2. **Analysis**: Explain the replay and ledger impact.
3. **Draft**: Propose the change in a safe workset.
4. **Validation**: Run `npm run check` and `flutter analyze`.
5. **Request**: Ask for explicit human approval via CLI.
6. **Execution**: Perform the change after confirmation.
