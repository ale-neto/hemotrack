import { ConfirmationService } from 'primeng/api';

/**
 * Padroniza o diálogo de "confirmar exclusão" do PrimeNG, hoje duplicado
 * quase palavra-por-palavra em 3 componentes (exams-list, profiles, settings).
 *
 * É uma função pura (não um service) porque cada feature hoje injeta sua
 * própria instância local de ConfirmationService (um `<p-confirm-dialog>`
 * por página) — não faria sentido centralizar isso num service
 * `providedIn: 'root'`, já que ele precisaria da instância de
 * ConfirmationService específica do componente chamador de qualquer forma.
 */
export function confirmDelete(
  confirmationService: ConfirmationService,
  message: string,
  onAccept: () => void,
  header = 'Confirmar exclusão',
): void {
  confirmationService.confirm({
    message,
    header,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Remover',
    rejectLabel: 'Cancelar',
    acceptButtonStyleClass: 'p-button-danger',
    accept: onAccept,
  });
}
