"""Decision-based fictional PVZ incidents. No automatic fines or allegations."""
import random

TEMPLATES = [
 ('client_rude','Клиент требует компенсацию','Клиент недоволен ожиданием и угрожает жалобой.', [('apologize','Извиниться и помочь',0,2),('ignore','Не реагировать',0,-5)]),
 ('client_funny','Странный отзыв','Клиент написал: «Зеркало показало мне понедельник, хотя сегодня пятница».',[('reply','Вежливо ответить',0,1),('ignore','Не отвечать',0,0)]),
 ('delivery_late','Поставка задержалась','Водитель задержался, очередь растёт.', [('reorganize','Перераспределить задачи',-300,2),('wait','Ждать',0,-2)]),
 ('internet','Интернет нестабилен','Рабочая программа периодически теряет соединение.', [('backup','Подключить резервный интернет',-900,3),('wait','Подождать восстановления',0,-3)]),
 ('scanner','Сканер работает с ошибками','Сотрудники тратят больше времени на операции.', [('repair','Вызвать специалиста',-1200,3),('manual','Работать осторожнее',0,-2)]),
 ('staff_conflict','Конфликт в смене','Сотрудники спорят о распределении обязанностей.', [('mediate','Разобраться в конфликте',0,2),('ignore','Не вмешиваться',0,-3)]),
 ('sick','Сотрудник заболел','Нужно срочно перестроить график.', [('replacement','Оплатить замену',-4500,2),('cover','Выйти самостоятельно',0,-1)]),
 ('inventory','Расхождение остатков','Инвентаризация обнаружила неучтённую коробку.', [('investigate','Проверить историю операций',-400,3),('defer','Отложить проверку',0,-4)]),
 ('camera','Камера не пишет архив','Есть риск остаться без видеодоказательств.', [('fix','Проверить и восстановить запись',-1500,3),('defer','Отложить ремонт',0,-4)]),
 ('power','Отключили электричество','ПВЗ временно не может обслуживать клиентов.', [('backup','Использовать резервное питание',-500,2),('wait','Дождаться электросети',0,-3)]),
 ('overload','Склад перегружен','Заказы размещают слишком плотно, поиск затруднён.', [('sort','Оплатить дополнительную сортировку',-2200,4),('ignore','Продолжить без изменений',0,-5)]),
 ('positive','Клиент благодарит сотрудника','Покупатель отметил отличное обслуживание.', [('praise','Похвалить сотрудника',0,2),('ignore','Пропустить сообщение',0,0)]),
]

def init_incidents(state):
    return state.setdefault('incidents', {'next_id':1,'pending':[],'resolved':[],'reputation':50,'seed':1234567})

def generate_incidents(state, count=1):
    data=init_incidents(state)
    rng=random.Random(data['seed'])
    generated=[]
    for _ in range(count):
        if len(data['pending'])>=30:
            break
        kind,title,description,options=rng.choice(TEMPLATES)
        incident={'id':data['next_id'],'day':state['day'],'kind':kind,'title':title,
                  'description':description,'options':[{'id':key,'label':label,'cost_rub':-cost if cost<0 else 0} for key,label,cost,_ in options]}
        data['next_id']+=1
        data['pending'].append(incident)
        generated.append(incident)
    data['seed']=rng.randrange(2**32)
    return generated

def resolve_incident(state, incident_id, option_id):
    data=init_incidents(state)
    incident=next((x for x in data['pending'] if x['id']==incident_id),None)
    if incident is None: raise ValueError('Incident not pending')
    template=next(x for x in TEMPLATES if x[0]==incident['kind'])
    option=next((x for x in template[3] if x[0]==option_id),None)
    if option is None: raise ValueError('Unknown decision')
    _,label,cost,reputation=option
    if state['balance']+cost<0: raise ValueError('Insufficient funds')
    state['balance']+=cost
    if cost:
        state['transactions'].append({'day':state['day'],'type':'incident_resolution','incident_id':incident_id,'amount':cost})
    data['reputation']=max(0,min(100,data['reputation']+reputation))
    data['pending'].remove(incident)
    result={'id':incident_id,'day':state['day'],'kind':incident['kind'],'decision':option_id,
            'label':label,'cost_rub':-cost,'reputation_change':reputation}
    data['resolved'].append(result)
    data['resolved']=data['resolved'][-300:]
    return result
