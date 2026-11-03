"""Persistent staff roster, schedules, morale and shift coverage for fictional PVZ game."""
import random

NAMES = ['Алексей', 'Марина', 'Денис', 'Ольга', 'Игорь', 'Анастасия', 'Роман', 'Вера']

def init_staff(state, seed=31):
    return state.setdefault('personnel', {'seed':seed, 'next_id':1, 'employees':[], 'wage_arrears':0, 'shift_log':[], 'auto_replacement':True})

def hire(state, name=None, wage=2800, skill=65, reliability=0.94, schedule='2/2'):
    p=init_staff(state)
    if not isinstance(wage,int) or wage<1000 or wage>15000: raise ValueError('Invalid wage')
    if not 0<=skill<=100 or not 0<=reliability<=1: raise ValueError('Invalid attributes')
    if schedule not in ('2/2','5/2'): raise ValueError('Invalid schedule')
    e={'id':p['next_id'],'name':name or NAMES[(p['next_id']-1)%len(NAMES)],'wage':wage,
       'skill':skill,'reliability':reliability,'schedule':schedule,'offset':(p['next_id']-1)%2*2,
       'morale':75,'fatigue':0,'experience':0,'active':True,'no_shows':0,'sick_days':0,'training':0}
    p['next_id']+=1;p['employees'].append(e)
    return e

def fire(state, employee_id):
    e=next((e for e in init_staff(state)['employees'] if e['id']==employee_id and e['active']),None)
    if e is None: raise ValueError('Employee not found')
    e['active']=False
    return e

def train(state, employee_id, cost=3500):
    e=next((e for e in init_staff(state)['employees'] if e['id']==employee_id and e['active']),None)
    if e is None: raise ValueError('Employee not found')
    if state['balance']<cost: raise ValueError('Insufficient funds')
    state['balance']-=cost
    state['transactions'].append({'day':state['day'],'type':'staff_training','employee_id':employee_id,'amount':-cost})
    e['skill']=min(100,e['skill']+8);e['morale']=min(100,e['morale']+4);e['training']+=1
    return e

def scheduled(e, day):
    if not e['active']: return False
    if e['schedule']=='2/2':return ((day-1+e['offset'])%4)<2
    return ((day-1)%7)<5

def resolve_shift(state, day):
    p=init_staff(state)
    rng=random.Random(p['seed'])
    roster=[e for e in p['employees'] if scheduled(e,day)]
    available=[];events=[]
    for e in p['employees']:
        if not e['active']:continue
        if e not in roster:
            e['fatigue']=max(0,e['fatigue']-14)
            continue
        prob=min(.8,max(.005,1-e['reliability'] + e['fatigue']*.0015 + (100-e['morale'])*.0008))
        if rng.random()<prob:
            reason=rng.choices(['illness','absence','alcohol_related_absence'],[5,4,1])[0]
            e['no_shows']+=1
            if reason=='illness':e['sick_days']+=1
            events.append({'type':'staff_no_show','employee_id':e['id'],'reason':reason})
            e['morale']=max(0,e['morale']-2)
        else: available.append(e)
    replacement=False
    if not available and p['auto_replacement'] and state['balance']>=4500:
        replacement=True;events.append({'type':'emergency_replacement','cost':4500})
    working=available[:1]
    for e in working:
        e['fatigue']=min(100,e['fatigue']+12)
        e['experience']+=1
        e['skill']=min(100,e['skill']+(1 if e['experience']%15==0 else 0))
    for e in available[1:]:e['fatigue']=max(0,e['fatigue']-5)
    p['seed']=rng.randrange(2**32)
    result={'staffed':bool(working or replacement),'replacement':replacement,'wage':4500 if replacement else sum(e['wage'] for e in working),
            'skill':int(sum(e['skill'] for e in working)/len(working)) if working else 55 if replacement else 0,
            'worker_ids':[e['id'] for e in working],'events':events}
    p['shift_log'].append({'day':day,**result});p['shift_log']=p['shift_log'][-90:]
    return result

def delay_wages(state, amount):
    if amount<0:raise ValueError('Invalid amount')
    p=init_staff(state);p['wage_arrears']+=amount
    for e in p['employees']:
        if e['active']:e['morale']=max(0,e['morale']-8)
    return p['wage_arrears']

def pay_arrears(state, amount):
    p=init_staff(state)
    if amount<=0 or amount>p['wage_arrears'] or amount>state['balance']:raise ValueError('Invalid payment')
    state['balance']-=amount;p['wage_arrears']-=amount
    state['transactions'].append({'day':state['day'],'type':'wage_arrears_payment','amount':-amount})
    for e in p['employees']:
        if e['active']:e['morale']=min(100,e['morale']+5)
    return p['wage_arrears']
