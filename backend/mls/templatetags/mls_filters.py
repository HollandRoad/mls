from django import template

register = template.Library()

@register.filter
def sum_amounts(expenses):
    return sum(expense.amount for expense in expenses) 