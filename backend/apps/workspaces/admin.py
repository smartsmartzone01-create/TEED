from django.contrib import admin

from .models import (
    Business,
    BusinessAccessRequest,
    BusinessControlRequest,
    BusinessInvitation,
    BusinessMembership,
    WorkspaceAuditEvent,
)

admin.site.register(Business)
admin.site.register(BusinessMembership)
admin.site.register(BusinessInvitation)
admin.site.register(BusinessAccessRequest)
admin.site.register(BusinessControlRequest)
admin.site.register(WorkspaceAuditEvent)
