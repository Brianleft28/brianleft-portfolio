import { INestApplicationContext } from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { TRANSLATABLE_SETTINGS, readableValue } from '../common/placeholders';
import { TranslationService } from '../modules/translation/translation.service';

/**
 * Completa la versión en inglés de la parametría que todavía no la tenga.
 *
 * Sin esto, un documento traducido queda con agujeros en español en el medio:
 * la portada en inglés decía "I'm Brian Benegas, Arquitecto de sistemas",
 * porque `{{owner_role}}` se resolvía siempre contra el valor en español.
 *
 * Sólo traduce lo que está en `null`, así que reejecutar el seeder no gasta
 * cuota. Cuando el dueño edita un valor desde el panel, la traducción se rehace
 * ahí mismo (`SettingsService`).
 */
export async function translateSettings(
  app: INestApplicationContext,
  userId: number,
): Promise<void> {
  const repository = app.get(DataSource).getRepository(Setting);
  const translation = app.get(TranslationService);

  const pending = await repository.find({
    where: { userId, key: In(TRANSLATABLE_SETTINGS), valueEn: IsNull() },
  });

  if (pending.length === 0) {
    console.log('⏭️  La parametría ya está traducida.');
    return;
  }

  // El free tier tiene cupo diario por modelo. Cuando se acaba, fallan todas
  // seguidas: insistir con el resto de la lista sólo llena el log de 429.
  let consecutiveFailures = 0;

  for (const setting of pending) {
    // Se traduce el texto legible, no el JSON crudo con el que el panel guarda
    // algunos valores: la versión en inglés es prosa y se usa tal cual.
    const source = readableValue(setting.value);
    if (!source.trim()) continue;

    const english = await translation.lineToEnglish(source);

    if (!english) {
      consecutiveFailures++;
      console.warn(`⚠️  "${setting.key}" quedó sin traducir; se sirve en español.`);

      if (consecutiveFailures >= 2) {
        console.warn(
          '⏸️  Dos fallos seguidos: probablemente se acabó la cuota del día.\n' +
            '   Lo que falta se traduce solo en la próxima corrida del seeder.',
        );
        return;
      }
      continue;
    }

    consecutiveFailures = 0;
    await repository.update(setting.id, { valueEn: english });
    console.log(`🌐 "${setting.key}" → "${english.slice(0, 60)}"`);
  }
}
