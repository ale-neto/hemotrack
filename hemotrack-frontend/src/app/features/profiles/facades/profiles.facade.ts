import { Injectable, inject, signal } from '@angular/core';
import { ProfileApiService } from '../services/profile-api.service';
import { NotificationService } from '@core/services/notification.service';
import { Profile } from '../models/profile.model';

/**
 * Única porta de entrada do ProfilesComponent. Componente não chama
 * ProfileApiService nem se inscreve em Observable algum.
 */
@Injectable({ providedIn: 'root' })
export class ProfilesFacade {
  private profileApi = inject(ProfileApiService);
  private notification = inject(NotificationService);

  private profilesSignal = signal<Profile[]>([]);
  private loadingSignal = signal(false);

  profiles = this.profilesSignal.asReadonly();
  loading  = this.loadingSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.profileApi.getAll().subscribe({
      next: r => {
        this.profilesSignal.set(r.data || []);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
        this.notification.error(null, 'Não foi possível carregar os perfis.');
      },
    });
  }

  save(payload: object, editingId: number | undefined, onSuccess: () => void, onError?: () => void): void {
    const request = editingId
      ? this.profileApi.update(editingId, payload)
      : this.profileApi.create(payload);

    request.subscribe({
      next: () => {
        this.notification.success('Perfil atualizado.', 'Salvo!');
        this.load();
        onSuccess();
      },
      error: err => {
        this.notification.error(err, 'Erro ao salvar.');
        onError?.();
      },
    });
  }

  delete(id: number): void {
    this.profileApi.delete(id).subscribe({
      next: () => {
        this.notification.success('Perfil excluído.', 'Removido');
        this.load();
      },
      error: () => this.notification.error(null, 'Não foi possível excluir.'),
    });
  }
}
