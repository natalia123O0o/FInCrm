import { z } from 'zod';
export const contactSchema = z.object({
  nombre:z.string().trim().min(2,'Escribe tu nombre (mínimo 2 caracteres)').max(80),
  empresa:z.string().trim().min(2,'Escribe el nombre de tu empresa').max(100),
  correo:z.string().trim().email('Escribe un correo válido').max(254),
  telefono:z.string().trim().max(25).refine(v=>!v||/^[+()0-9\s-]{7,25}$/.test(v),'Teléfono no válido'),
  planInteres:z.string().trim().regex(/^[A-Z0-9_-]{0,40}$/),
  mensaje:z.string().trim().min(10,'Cuéntanos un poco más (mínimo 10 caracteres)').max(1000),
  aceptaDatos:z.literal(true,{errorMap:()=>({message:'Debes autorizar el uso de datos para responderte'})}),
  website:z.string().max(200).optional(),
});
