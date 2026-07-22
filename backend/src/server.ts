import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(rateLimit({windowMs:60_000,limit:300,standardHeaders:true,legacyHeaders:false}));

type AuthReq = Request & { user?: {id:string; establishmentId:string; role:string} };
const param=(v:string|string[]|undefined,n:string)=>{if(typeof v==='string'&&v)return v;if(Array.isArray(v)&&v[0])return v[0];throw new Error(`Parâmetro inválido: ${n}`)};
const money=(v:any)=>Number(v||0);
const asyncRoute=(fn:any)=>(req:Request,res:Response,next:NextFunction)=>Promise.resolve(fn(req,res,next)).catch(next);
function auth(req:AuthReq,res:Response,next:NextFunction){const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({message:'Não autenticado'});try{req.user=jwt.verify(h.slice(7),JWT_SECRET) as any;next()}catch{return res.status(401).json({message:'Sessão expirada'})}}
const tenant=(req:AuthReq)=>req.user!.establishmentId;

const docs={openapi:'3.0.0',info:{title:'Delivery SaaS API',version:'1.1.0'},paths:{'/health':{get:{responses:{'200':{description:'OK'}}}},'/api/auth/login':{post:{summary:'Login'}},'/api/products':{get:{summary:'Produtos'},post:{summary:'Criar produto'}},'/api/orders':{get:{summary:'Pedidos'},post:{summary:'Criar pedido'}}}};
app.use('/docs',swaggerUi.serve,swaggerUi.setup(docs));
app.get('/health',(_req,res)=>res.json({status:'ok',version:'1.1.0',time:new Date().toISOString()}));

app.post('/api/auth/login',asyncRoute(async(req:Request,res:Response)=>{const body=z.object({email:z.string().email(),password:z.string().min(6)}).parse(req.body);const user=await prisma.user.findUnique({where:{email:body.email},include:{establishment:true}});if(!user||!user.active||!await bcrypt.compare(body.password,user.passwordHash))return res.status(401).json({message:'E-mail ou senha inválidos'});await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});const token=jwt.sign({id:user.id,establishmentId:user.establishmentId,role:user.role},JWT_SECRET,{expiresIn:'12h'});res.json({token,user:{id:user.id,name:user.name,email:user.email,role:user.role,avatarUrl:user.avatarUrl},establishment:user.establishment})}));
app.get('/api/me',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.user.findUnique({where:{id:req.user!.id},select:{id:true,name:true,email:true,role:true,avatarUrl:true,establishment:true}}))));

app.get('/api/dashboard',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const e=tenant(req);const start=new Date();start.setHours(0,0,0,0);const month=new Date(start.getFullYear(),start.getMonth(),1);const [products,customers,ordersToday,revenueToday,pending,monthOrders,recent,top]=await Promise.all([
 prisma.product.count({where:{establishmentId:e}}),prisma.customer.count({where:{establishmentId:e}}),prisma.order.count({where:{establishmentId:e,createdAt:{gte:start}}}),prisma.order.aggregate({where:{establishmentId:e,createdAt:{gte:start},status:{notIn:['CANCELLED','REJECTED']}},_sum:{total:true}}),prisma.order.count({where:{establishmentId:e,status:{in:['PENDING','CONFIRMED','PREPARING']}}}),prisma.order.findMany({where:{establishmentId:e,createdAt:{gte:month},status:{notIn:['CANCELLED','REJECTED']}},select:{createdAt:true,total:true}}),prisma.order.findMany({where:{establishmentId:e},orderBy:{createdAt:'desc'},take:6,include:{customer:true}}),prisma.orderItem.groupBy({by:['productNameSnapshot'],where:{order:{establishmentId:e}},_sum:{quantity:true,subtotal:true},orderBy:{_sum:{quantity:'desc'}},take:5})]);
 const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));d.setHours(0,0,0,0);const next=new Date(d);next.setDate(next.getDate()+1);const os=monthOrders.filter(o=>o.createdAt>=d&&o.createdAt<next);return {day:d.toLocaleDateString('pt-BR',{weekday:'short'}),orders:os.length,revenue:os.reduce((s,o)=>s+money(o.total),0)}});
 res.json({metrics:{products,customers,ordersToday,revenueToday:money(revenueToday._sum.total),pending},salesChart:days,recentOrders:recent,topProducts:top});
}));

app.get('/api/categories',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.category.findMany({where:{establishmentId:tenant(req)},orderBy:{sortOrder:'asc'},include:{_count:{select:{products:true}}}}))));
app.post('/api/categories',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({name:z.string().min(2),description:z.string().optional(),active:z.boolean().optional(),sortOrder:z.number().int().optional()}).parse(req.body);res.status(201).json(await prisma.category.create({data:{...b,establishmentId:tenant(req)}}))}));
app.put('/api/categories/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.category.update({where:{id:param(req.params.id,'id'),establishmentId:tenant(req)},data:req.body}))));
app.delete('/api/categories/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>{await prisma.category.delete({where:{id:param(req.params.id,'id'),establishmentId:tenant(req)}});res.status(204).end()}));

app.get('/api/products',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.product.findMany({where:{establishmentId:tenant(req)},orderBy:{createdAt:'desc'},include:{category:true,modifierGroups:{include:{group:{include:{options:true}}}}}}))));
app.post('/api/products',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({name:z.string().min(2),description:z.string().optional(),categoryId:z.string(),price:z.coerce.number().positive(),promotionalPrice:z.coerce.number().nullable().optional(),costPrice:z.coerce.number().nullable().optional(),sku:z.string().nullable().optional(),imageUrl:z.string().nullable().optional(),available:z.boolean().optional(),featured:z.boolean().optional(),trackStock:z.boolean().optional(),stock:z.number().int().nullable().optional(),preparationTime:z.number().int().nullable().optional(),tags:z.array(z.string()).optional(),productType:z.enum(['STANDARD','PIZZA','COMBO','CUSTOM']).default('STANDARD'),minFlavors:z.coerce.number().int().min(1).default(1),maxFlavors:z.coerce.number().int().min(1).default(1),pricingRule:z.enum(['BASE','HIGHEST_FLAVOR','AVERAGE_FLAVOR','SUM']).default('BASE')}).parse(req.body);res.status(201).json(await prisma.product.create({data:{...b,establishmentId:tenant(req)}}))}));
app.put('/api/products/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.product.update({where:{id:param(req.params.id,'id'),establishmentId:tenant(req)},data:req.body}))));
app.delete('/api/products/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>{await prisma.product.delete({where:{id:param(req.params.id,'id'),establishmentId:tenant(req)}});res.status(204).end()}));

// Motor de montagem multi-nicho: grupos reutilizáveis (tamanho, sabor, borda, adicionais, ponto, acompanhamentos...)
app.get('/api/modifier-groups',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.modifierGroup.findMany({where:{establishmentId:tenant(req)},orderBy:{sortOrder:'asc'},include:{options:{orderBy:{sortOrder:'asc'}},products:{select:{productId:true}}}}))));
app.post('/api/modifier-groups',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({name:z.string().min(2),minSelect:z.coerce.number().int().min(0).default(0),maxSelect:z.coerce.number().int().min(1).default(1),required:z.boolean().default(false),displayType:z.enum(['RADIO','CHECKBOX','QUANTITY','FLAVOR']).default('CHECKBOX'),calculationType:z.enum(['ADD','REPLACE','HIGHEST','AVERAGE']).default('ADD'),freeQuantity:z.coerce.number().int().min(0).default(0),sortOrder:z.coerce.number().int().default(0),active:z.boolean().default(true),options:z.array(z.object({name:z.string().min(1),price:z.coerce.number().min(0).default(0),sortOrder:z.coerce.number().int().default(0),maxQuantity:z.coerce.number().int().min(1).default(1),metadata:z.any().optional()})).default([])}).parse(req.body);const {options,...group}=b;res.status(201).json(await prisma.modifierGroup.create({data:{...group,establishmentId:tenant(req),options:{create:options}},include:{options:true}}))}));
app.put('/api/modifier-groups/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const id=param(req.params.id,'id');const exists=await prisma.modifierGroup.findFirstOrThrow({where:{id,establishmentId:tenant(req)}});const b=z.object({name:z.string().min(2).optional(),minSelect:z.coerce.number().int().min(0).optional(),maxSelect:z.coerce.number().int().min(1).optional(),required:z.boolean().optional(),displayType:z.enum(['RADIO','CHECKBOX','QUANTITY','FLAVOR']).optional(),calculationType:z.enum(['ADD','REPLACE','HIGHEST','AVERAGE']).optional(),freeQuantity:z.coerce.number().int().min(0).optional(),sortOrder:z.coerce.number().int().optional(),active:z.boolean().optional()}).parse(req.body);res.json(await prisma.modifierGroup.update({where:{id:exists.id},data:b,include:{options:true}}))}));
app.delete('/api/modifier-groups/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const id=param(req.params.id,'id');await prisma.modifierGroup.findFirstOrThrow({where:{id,establishmentId:tenant(req)}});await prisma.modifierGroup.delete({where:{id}});res.status(204).end()}));
app.post('/api/modifier-groups/:id/options',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const groupId=param(req.params.id,'id');await prisma.modifierGroup.findFirstOrThrow({where:{id:groupId,establishmentId:tenant(req)}});const b=z.object({name:z.string().min(1),price:z.coerce.number().min(0).default(0),sortOrder:z.coerce.number().int().default(0),maxQuantity:z.coerce.number().int().min(1).default(1),metadata:z.any().optional()}).parse(req.body);res.status(201).json(await prisma.modifierOption.create({data:{...b,groupId}}))}));
app.delete('/api/modifier-options/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const id=param(req.params.id,'id');const option=await prisma.modifierOption.findUniqueOrThrow({where:{id},include:{group:true}});if(option.group.establishmentId!==tenant(req))return res.status(403).json({message:'Sem permissão'});await prisma.modifierOption.delete({where:{id}});res.status(204).end()}));
app.put('/api/products/:id/modifier-groups',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const productId=param(req.params.id,'id');await prisma.product.findFirstOrThrow({where:{id:productId,establishmentId:tenant(req)}});const {groupIds}=z.object({groupIds:z.array(z.string())}).parse(req.body);const valid=await prisma.modifierGroup.findMany({where:{id:{in:groupIds},establishmentId:tenant(req)},select:{id:true}});if(valid.length!==new Set(groupIds).size)return res.status(400).json({message:'Um ou mais grupos são inválidos'});await prisma.$transaction([prisma.productModifierGroup.deleteMany({where:{productId}}),prisma.productModifierGroup.createMany({data:valid.map(g=>({productId,groupId:g.id})),skipDuplicates:true})]);res.json(await prisma.product.findUnique({where:{id:productId},include:{modifierGroups:{include:{group:{include:{options:true}}}}}}))}));


app.get('/api/customers',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.customer.findMany({where:{establishmentId:tenant(req)},orderBy:{createdAt:'desc'},include:{addresses:true,_count:{select:{orders:true}}}}))));
app.post('/api/customers',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({name:z.string().min(2),phone:z.string().min(8),email:z.string().email().optional().or(z.literal('')),notes:z.string().optional()}).parse(req.body);res.status(201).json(await prisma.customer.create({data:{...b,email:b.email||null,establishmentId:tenant(req)}}))}));

app.get('/api/orders', auth, asyncRoute(async (req: AuthReq, res: Response) => {
  const status = req.query.status as OrderStatus | undefined;
  const orders = await prisma.order.findMany({
    where: {
      establishmentId: tenant(req),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      address: true,
      items: true,
      history: { orderBy: { createdAt: 'asc' } },
    },
  });
  res.json(orders);
}));
app.post('/api/orders',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const e=tenant(req);const b=z.object({customerId:z.string(),addressId:z.string().nullable().optional(),deliveryType:z.enum(['DELIVERY','PICKUP','DINE_IN','SCHEDULED']),paymentMethod:z.enum(['PIX','CASH','CREDIT_CARD','DEBIT_CARD','ONLINE']),notes:z.string().optional(),deliveryFee:z.coerce.number().default(0),discount:z.coerce.number().default(0),items:z.array(z.object({productId:z.string(),quantity:z.number().int().positive(),notes:z.string().optional()})).min(1)}).parse(req.body);const products=await prisma.product.findMany({where:{id:{in:b.items.map(i=>i.productId)},establishmentId:e}});const items=b.items.map(i=>{const p=products.find(x=>x.id===i.productId);if(!p)throw new Error('Produto não encontrado');const unit=money(p.promotionalPrice??p.price);return {productId:p.id,productNameSnapshot:p.name,unitPrice:unit,quantity:i.quantity,subtotal:unit*i.quantity,notes:i.notes}});const subtotal=items.reduce((s,i)=>s+i.subtotal,0);const last=await prisma.order.aggregate({where:{establishmentId:e},_max:{orderNumber:true}});const order=await prisma.order.create({data:{establishmentId:e,customerId:b.customerId,addressId:b.addressId,orderNumber:(last._max.orderNumber||1000)+1,channel:'PANEL',status:'PENDING',deliveryType:b.deliveryType,paymentMethod:b.paymentMethod,subtotal,discount:b.discount,deliveryFee:b.deliveryFee,total:subtotal-b.discount+b.deliveryFee,notes:b.notes,items:{create:items},history:{create:{to:'PENDING',origin:'PANEL'}}},include:{customer:true,items:true}});res.status(201).json(order)}));
app.patch('/api/orders/:id/status',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const id=param(req.params.id,'id');const {status,note}=z.object({status:z.nativeEnum(OrderStatus),note:z.string().optional()}).parse(req.body);const current=await prisma.order.findFirstOrThrow({where:{id,establishmentId:tenant(req)}});const updated=await prisma.order.update({where:{id},data:{status,history:{create:{from:current.status,to:status,origin:'PANEL',note}}},include:{customer:true,items:true}});res.json(updated)}));

app.get('/api/coupons',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.coupon.findMany({where:{establishmentId:tenant(req)},orderBy:{createdAt:'desc'}}))));
app.post('/api/coupons',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({code:z.string().min(3),description:z.string().optional(),discountType:z.enum(['PERCENT','FIXED']),discountValue:z.coerce.number().positive(),minimumOrder:z.coerce.number().default(0),maxUses:z.number().int().nullable().optional(),expiresAt:z.string().nullable().optional(),active:z.boolean().optional()}).parse(req.body);res.status(201).json(await prisma.coupon.create({data:{...b,code:b.code.toUpperCase(),expiresAt:b.expiresAt?new Date(b.expiresAt):null,establishmentId:tenant(req)}}))}));
app.put('/api/coupons/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.coupon.update({where:{id:param(req.params.id,'id'),establishmentId:tenant(req)},data:req.body}))));

app.get('/api/delivery-zones',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.deliveryZone.findMany({where:{establishmentId:tenant(req)}}))));
app.post('/api/delivery-zones',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({name:z.string(),neighborhoods:z.array(z.string()),fee:z.coerce.number(),minimumOrder:z.coerce.number().default(0),estimatedMinutes:z.number().int().default(45),active:z.boolean().optional()}).parse(req.body);res.status(201).json(await prisma.deliveryZone.create({data:{...b,establishmentId:tenant(req)}}))}));
app.put('/api/delivery-zones/:id',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.deliveryZone.update({where:{id:param(req.params.id,'id')},data:req.body}))));

app.get('/api/team',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.user.findMany({where:{establishmentId:tenant(req)},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true}}))));
app.post('/api/team',auth,asyncRoute(async(req:AuthReq,res:Response)=>{const b=z.object({name:z.string(),email:z.string().email(),password:z.string().min(6),role:z.enum(['OWNER','MANAGER','ATTENDANT','KITCHEN','DRIVER'])}).parse(req.body);const { password, ...userData } = b;res.status(201).json(await prisma.user.create({data:{...userData,passwordHash:await bcrypt.hash(password,10),establishmentId:tenant(req)},select:{id:true,name:true,email:true,role:true,active:true}}))}));

app.get('/api/settings',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.establishment.findUnique({where:{id:tenant(req)}}))));
app.put('/api/settings',auth,asyncRoute(async(req:AuthReq,res:Response)=>res.json(await prisma.establishment.update({where:{id:tenant(req)},data:req.body}))));

app.get('/api/public/:slug/menu',asyncRoute(async(req:Request,res:Response)=>{const est=await prisma.establishment.findUnique({where:{slug:param(req.params.slug,'slug')}});if(!est||!est.active)return res.status(404).json({message:'Loja não encontrada'});const categories=await prisma.category.findMany({where:{establishmentId:est.id,active:true},orderBy:{sortOrder:'asc'},include:{products:{where:{available:true},orderBy:{name:'asc'},include:{modifierGroups:{include:{group:{include:{options:{where:{active:true},orderBy:{sortOrder:'asc'}}}}}}}}}});res.json({establishment:est,categories})}));


app.get('/api/reports',auth,asyncRoute(async(req:AuthReq,res:Response)=>{
  const e=tenant(req);
  const now=new Date();
  const startMonth=new Date(now.getFullYear(),now.getMonth(),1);
  const startPrev=new Date(now.getFullYear(),now.getMonth()-1,1);
  const endPrev=new Date(now.getFullYear(),now.getMonth(),1);
  const [current,previous,byPayment,byChannel,topProducts,customers]=await Promise.all([
    prisma.order.findMany({where:{establishmentId:e,createdAt:{gte:startMonth},status:{notIn:['CANCELLED','REJECTED']}},select:{createdAt:true,total:true,deliveryFee:true,discount:true}}),
    prisma.order.findMany({where:{establishmentId:e,createdAt:{gte:startPrev,lt:endPrev},status:{notIn:['CANCELLED','REJECTED']}},select:{total:true}}),
    prisma.order.groupBy({by:['paymentMethod'],where:{establishmentId:e,createdAt:{gte:startMonth},status:{notIn:['CANCELLED','REJECTED']}},_count:{_all:true},_sum:{total:true}}),
    prisma.order.groupBy({by:['channel'],where:{establishmentId:e,createdAt:{gte:startMonth}},_count:{_all:true},_sum:{total:true}}),
    prisma.orderItem.groupBy({by:['productNameSnapshot'],where:{order:{establishmentId:e,createdAt:{gte:startMonth}}},_sum:{quantity:true,subtotal:true},orderBy:{_sum:{subtotal:'desc'}},take:8}),
    prisma.customer.count({where:{establishmentId:e,createdAt:{gte:startMonth}}})
  ]);
  const revenue=current.reduce((s,o)=>s+money(o.total),0);
  const previousRevenue=previous.reduce((s,o)=>s+money(o.total),0);
  const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));d.setHours(0,0,0,0);const next=new Date(d);next.setDate(next.getDate()+1);const os=current.filter(o=>o.createdAt>=d&&o.createdAt<next);return {day:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),revenue:os.reduce((s,o)=>s+money(o.total),0),orders:os.length}});
  res.json({summary:{revenue,orders:current.length,averageTicket:current.length?revenue/current.length:0,newCustomers:customers,growth:previousRevenue?((revenue-previousRevenue)/previousRevenue)*100:100},days,byPayment,byChannel,topProducts});
}));

app.get('/api/kitchen',auth,asyncRoute(async(req:AuthReq,res:Response)=>{
  res.json(await prisma.order.findMany({where:{establishmentId:tenant(req),status:{in:['PENDING','CONFIRMED','PREPARING','READY']}},orderBy:{createdAt:'asc'},include:{customer:true,items:true}}));
}));

app.post('/api/public/:slug/orders',asyncRoute(async(req:Request,res:Response)=>{
  const slug=param(req.params.slug,'slug');
  const est=await prisma.establishment.findUnique({where:{slug}});
  if(!est||!est.active||!est.acceptingOrders)return res.status(400).json({message:'A loja não está aceitando pedidos agora'});
  const b=z.object({
    customer:z.object({name:z.string().min(2),phone:z.string().min(8),email:z.string().email().optional().or(z.literal(''))}),
    address:z.object({zipCode:z.string().min(5),street:z.string().min(2),number:z.string().min(1),complement:z.string().optional(),neighborhood:z.string().min(2),city:z.string().min(2),state:z.string().min(2),reference:z.string().optional()}).optional(),
    deliveryType:z.enum(['DELIVERY','PICKUP']).default('DELIVERY'),
    paymentMethod:z.enum(['PIX','CASH','CREDIT_CARD','DEBIT_CARD','ONLINE']).default('PIX'),
    notes:z.string().optional(),
    items:z.array(z.object({productId:z.string(),quantity:z.number().int().positive()})).min(1)
  }).parse(req.body);
  const products=await prisma.product.findMany({where:{id:{in:b.items.map(i=>i.productId)},establishmentId:est.id,available:true}});
  if(products.length!==new Set(b.items.map(i=>i.productId)).size)return res.status(400).json({message:'Um ou mais produtos não estão disponíveis'});
  const customer=await prisma.customer.upsert({where:{establishmentId_phone:{establishmentId:est.id,phone:b.customer.phone}},update:{name:b.customer.name,email:b.customer.email||null},create:{...b.customer,email:b.customer.email||null,establishmentId:est.id}});
  let addressId:string|undefined;
  if(b.deliveryType==='DELIVERY'&&b.address){const address=await prisma.customerAddress.create({data:{...b.address,customerId:customer.id,label:'Entrega',primary:true}});addressId=address.id}
  const items=b.items.map(i=>{const p=products.find(x=>x.id===i.productId)!;const unit=money(p.promotionalPrice??p.price);return {productId:p.id,productNameSnapshot:p.name,unitPrice:unit,quantity:i.quantity,subtotal:unit*i.quantity}});
  const subtotal=items.reduce((s,i)=>s+i.subtotal,0);
  const deliveryFee=b.deliveryType==='DELIVERY'?5:0;
  const last=await prisma.order.aggregate({where:{establishmentId:est.id},_max:{orderNumber:true}});
  const order=await prisma.order.create({data:{establishmentId:est.id,customerId:customer.id,addressId,orderNumber:(last._max.orderNumber||1000)+1,channel:'WEBSITE',status:'PENDING',deliveryType:b.deliveryType,paymentMethod:b.paymentMethod,subtotal,deliveryFee,total:subtotal+deliveryFee,notes:b.notes,items:{create:items},history:{create:{to:'PENDING',origin:'WEBSITE'}}},include:{items:true}});
  res.status(201).json({id:order.id,orderNumber:order.orderNumber,status:order.status,total:order.total});
}));

app.get('/api/integrations/menu',asyncRoute(async(req:Request,res:Response)=>{const key=String(req.headers['x-api-key']||'');const hash=crypto.createHash('sha256').update(key).digest('hex');const apiKey=await prisma.apiKey.findUnique({where:{keyHash:hash},include:{establishment:true}});if(!apiKey?.active)return res.status(401).json({message:'API key inválida'});const categories=await prisma.category.findMany({where:{establishmentId:apiKey.establishmentId,active:true},include:{products:{where:{available:true}}}});res.json({establishment:apiKey.establishment,categories})}));

app.use((err:any,_req:Request,res:Response,_next:NextFunction)=>{console.error(err);if(err?.name==='ZodError')return res.status(400).json({message:'Dados inválidos',issues:err.issues});if(err?.code==='P2002')return res.status(409).json({message:'Registro duplicado'});if(err?.code==='P2025')return res.status(404).json({message:'Registro não encontrado'});res.status(500).json({message:err?.message||'Erro interno'})});
app.listen(PORT,()=>console.log(`Delivery Painel Release 1.1 API em http://localhost:${PORT} | Swagger /docs`));
process.on('SIGTERM',async()=>{await prisma.$disconnect();process.exit(0)});
