import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateArabic',
})
export class DateArabicPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
