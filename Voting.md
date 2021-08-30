**Voting system use cases**

T = Trusted account
A = Non trusted account
***Simple delegation to non trusted account***
T1 > T2
T2 > A3

A3 Votes yes

.. 2 votes yes


***Simple delegation***
T1 > T2

T2 Votes yes

.. 2 votes yes


***Self delegation***
T1 > T1

T1 Votes yes

.. 1 votes yes


***Delegated but voted***
T1 > T2

T1 Votes no
T2 Votes yes

.. 1 vote yes, 1 vote no


***Delegated account does not vote***
T1 > T2

T1 Votes no

.. 1 vote no


***Basic answer Proportion***
T1 > T2

T2 Votes 90% yes, 10% no

.. 90% yes, 10% no, sum: 2 votes


***Basic answer Proportion each own vote***
T1 > T2

T1 Votes 90% yes, 10% no
T2 Votes 50% yes, 50% no

.. 70% yes, 30% no, sum: 2 votes

***Non trusted voted***
T1 > T2
T2 > A3

A3 Votes 70% yes, 30% no

.. 70% yes, 30% no, sum: 2 votes

***Non trusted delegated from***
A1 > T2
T2 > T3

T3 Votes 70% yes, 30% no

.. 70% yes, 30% no, sum: 2 votes


***Basic split***
T1 > 30% > T2
T1 > 70% > T3

T2 Votes 80% yes, 20% no
T3 Votes 60% yes, 40% no

yes = (0.3*0.8+0.7*0.6 + 0.8 + 0.6)/3 = 0.68666 = 68.7%
no = (0.3*0.2+0.7*0.4+0.2+0.4)/3 = 0.94/3 = 0,31333 = 31.3%
sum = 3 votes

***Basic split, one does not vote***
T1 > 30% > T2
T1 > 70% > T3

T3 Votes 60% yes, 40% no

yes = 0.7*0.6+0.6 = 1,02 = 60%
no = 0.7*0.4+0.4 = 0.68  = 40%
votes = 1.7

***Circular delegation - two votes***
T1 > 10% > T2
T1 > 90% > T3

T2 > 20% > T1
T2 > 80% > T3

T3 > 30% > T1
T3 > 70% > T2

T2 Votes 20% yes, 80% no
T3 Votes 60% yes, 40% no

yes = 0.6 + 0.2 + 0.1*0.2 + 0.9*0.6 = 1,36 = 45.3%
no  = 0.4 + 0.8 + 0.1*0.8 + 0.9*0.4 = 1,64 = 54.7%
votes = 3

***Circular delegation - one vote***
T1 > 10% > T2
T1 > 90% > T3

T2 > 20% > T1
T2 > 80% > T3

T3 > 30% > T1
T3 > 70% > T2

T3 Votes 60% yes, 40% no

yes = 0.6 + 0.6*0.8 + 0.6*0.9 + 0.6*0.8*0.1 + 0.6*0.9*0.2 + 0.6*0.8*0.1*0.2+ 0.6*0.9*0.2*0.1 + 0.6*0.8*0.1*0.2*0.1+ 0.6*0.9*0.2*0.1*0.2 ... = 1,79952 = 60%
no  = 0.4 + 0.4*0.8 + 0.4*0.9 + 0.4*0.8*0.1 + 0.4*0.9*0.2 + 0.4*0.8*0.1*0.2+ 0.4*0.9*0.2*0.1 + 0.4*0.8*0.1*0.2*0.1+ 0.4*0.9*0.2*0.1*0.2 ... = 1,19968 = 40%
votes = 3
